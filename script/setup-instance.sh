#!/bin/bash

# Script to set up an isolated development instance of Chorus
# Usage: ./script/setup-instance.sh [instance-name]

# Get the directory containing this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Determine the repo directory:
# - If current directory looks like a Chorus repo, use it (allows running from worktrees)
# - Otherwise, use the script's parent directory
if [ -f "$(pwd)/src-tauri/Cargo.toml" ]; then
    REPO_DIR="$(pwd)"
else
    REPO_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
fi

# Get just the directory name
DEFAULT_INSTANCE_NAME="$(basename "$REPO_DIR")"

# Get the instance name from the first argument, or use the repo directory name if not provided
INSTANCE_NAME="${1:-$DEFAULT_INSTANCE_NAME}"

# Sanitize the instance name to be filesystem-safe
SAFE_INSTANCE_NAME=$(echo "$INSTANCE_NAME" | sed 's/[^a-zA-Z0-9_-]/_/g')

# Create the unique identifier
IDENTIFIER="sh.chorus.app.dev.$SAFE_INSTANCE_NAME"

echo "Setting up Chorus development instance: $INSTANCE_NAME"
echo "App identifier: $IDENTIFIER"
echo ""

# Check if we're in a git worktree and find the main repo
MAIN_REPO=""
if [ -f "$REPO_DIR/.git" ]; then
    # We're in a worktree - .git is a file pointing to the main repo
    GITDIR=$(cat "$REPO_DIR/.git" | sed 's/gitdir: //')
    # The gitdir points to .git/worktrees/<name>, so go up 3 levels to get the main repo
    MAIN_REPO=$(cd "$GITDIR/../../.." && pwd)
    echo "Detected git worktree. Main repo: $MAIN_REPO"
fi

# Set up dependencies
if [ -n "$MAIN_REPO" ] && [ -d "$MAIN_REPO/node_modules" ]; then
    # Symlink node_modules from main repo
    echo "Symlinking node_modules from main repo..."
    if [ -d "$REPO_DIR/node_modules" ] && [ ! -L "$REPO_DIR/node_modules" ]; then
        echo "Removing existing node_modules directory..."
        rm -rf "$REPO_DIR/node_modules"
    fi
    if [ ! -L "$REPO_DIR/node_modules" ]; then
        ln -s "$MAIN_REPO/node_modules" "$REPO_DIR/node_modules"
        echo "✅ node_modules symlinked"
    else
        echo "✅ node_modules symlink already exists"
    fi
else
    # Install dependencies normally (main repo or no existing node_modules)
    echo "Installing dependencies..."
    pnpm i
    echo "✅ Dependencies installed"
fi

# Set up Rust target directory
if [ -n "$MAIN_REPO" ] && [ -d "$MAIN_REPO/src-tauri/target" ]; then
    # Symlink target directory from main repo
    echo "Symlinking Rust target directory from main repo..."
    if [ -d "$REPO_DIR/src-tauri/target" ] && [ ! -L "$REPO_DIR/src-tauri/target" ]; then
        echo "Removing existing target directory..."
        rm -rf "$REPO_DIR/src-tauri/target"
    fi
    if [ ! -L "$REPO_DIR/src-tauri/target" ]; then
        ln -s "$MAIN_REPO/src-tauri/target" "$REPO_DIR/src-tauri/target"
        echo "✅ Rust target directory symlinked"
    else
        echo "✅ Rust target directory symlink already exists"
    fi
else
    echo "Rust target will be built fresh (no main repo target found)"

fi

echo ""

# Create the Application Support directory
APP_SUPPORT_DIR="$HOME/Library/Application Support"
INSTANCE_DIR="$APP_SUPPORT_DIR/$IDENTIFIER"

if [ ! -d "$INSTANCE_DIR" ]; then
    echo "Creating data directory: $INSTANCE_DIR"
    mkdir -p "$INSTANCE_DIR"
else
    echo "✅ Data directory already exists: $INSTANCE_DIR"
fi

# The sources to check for settings and chats database, preferring production first.
SOURCES=(
    "$APP_SUPPORT_DIR/sh.chorus.app"
    "$APP_SUPPORT_DIR/sh.chorus.app.dev"
    "$APP_SUPPORT_DIR/sh.chorus.app.dev.chorus"
)

# Copy settings and chats if it exists in any of the potential source directories.
FOUND_SETTINGS=false
FOUND_CHATS_DB=false
for source in "${SOURCES[@]}"; do
    source_settings="$source/settings"
    source_chats_db="$source/chats.db"
    if [ "$FOUND_SETTINGS" = false ] && [ -f "$source_settings" ]; then
        echo "Copying settings from $source..."
        cp "$source_settings" "$INSTANCE_DIR/settings"
        echo "✅ Settings copied successfully"
        FOUND_SETTINGS=true
    fi
    if [ "$FOUND_CHATS_DB" = false ] && [ -f "$source_chats_db" ]; then
        echo "Copying chats.db from $source using sqlite's online backup API..."
        if ! sqlite3 "$source_chats_db" ".backup '$INSTANCE_DIR/chats.db'"; then
            echo "❌ Failed to copy chats database - database will start empty"
        fi
        echo "✅ Chats copied successfully"
        FOUND_CHATS_DB=true
    fi
done

if [ "$FOUND_SETTINGS" = false ]; then
    echo "⚠️ No settings found in any of the source directories - settings will start empty"
fi
if [ "$FOUND_CHATS_DB" = false ]; then
    echo "⚠️ No chats.db found in any of the source directories - database will start empty"
fi


echo ""

RANDOM_COLORS=(
    "darkorange"
    "darkred"
    "darkgreen"
    "darkblue"
    "darkviolet"
    "saddlebrown"
    "darkgray"
    "darkgoldenrod"
    "deeppink"
)

RANDOM_COLOR=${RANDOM_COLORS[$RANDOM % ${#RANDOM_COLORS[@]}]}

# Generate custom icon with ImageMagick if available
if command -v magick >/dev/null 2>&1; then
    echo "Generating custom icon..."
    
    # Create instance icons directory
    ICONS_DIR="$INSTANCE_DIR/icons"
    mkdir -p "$ICONS_DIR"
    
    # Generate icon with instance name overlay
    # Use the dev icon as base
    BASE_ICON="$REPO_DIR/src-tauri/icons/icon.png"
    OUTPUT_ICON="$ICONS_DIR/icon.png"
    
    # Create icon with text overlay
    # Position text in the bottom third of the icon
    magick "$BASE_ICON" \
        -gravity South \
        -pointsize 86 \
        -font Arial-Bold \
        -fill $RANDOM_COLOR \
        -stroke white \
        -strokewidth 2 \
        -annotate +0+60 "$INSTANCE_NAME" \
        "$OUTPUT_ICON"
    
    # Also create the .icns file for macOS
    # First create required sizes
    mkdir -p "$ICONS_DIR/icon.iconset"
    
    # Generate all required sizes for iconset
    magick "$OUTPUT_ICON" -resize 16x16     "$ICONS_DIR/icon.iconset/icon_16x16.png"
    magick "$OUTPUT_ICON" -resize 32x32     "$ICONS_DIR/icon.iconset/icon_16x16@2x.png"
    magick "$OUTPUT_ICON" -resize 32x32     "$ICONS_DIR/icon.iconset/icon_32x32.png"
    magick "$OUTPUT_ICON" -resize 64x64     "$ICONS_DIR/icon.iconset/icon_32x32@2x.png"
    magick "$OUTPUT_ICON" -resize 128x128   "$ICONS_DIR/icon.iconset/icon_128x128.png"
    magick "$OUTPUT_ICON" -resize 256x256   "$ICONS_DIR/icon.iconset/icon_128x128@2x.png"
    magick "$OUTPUT_ICON" -resize 256x256   "$ICONS_DIR/icon.iconset/icon_256x256.png"
    magick "$OUTPUT_ICON" -resize 512x512   "$ICONS_DIR/icon.iconset/icon_256x256@2x.png"
    magick "$OUTPUT_ICON" -resize 512x512   "$ICONS_DIR/icon.iconset/icon_512x512.png"
    magick "$OUTPUT_ICON" -resize 1024x1024 "$ICONS_DIR/icon.iconset/icon_512x512@2x.png"
    
    # Convert to .icns
    iconutil -c icns "$ICONS_DIR/icon.iconset" -o "$ICONS_DIR/icon.icns" 2>/dev/null || true
    
    # Clean up iconset
    rm -rf "$ICONS_DIR/icon.iconset"
    
    echo "✅ Custom icon generated!"
else
    echo "⚠️ ImageMagick not found - skipping icon generation"
    echo "  Install with: brew install imagemagick"
fi

echo ""
echo "🎉 Setup for instance $INSTANCE_NAME complete! You can now run:"
echo "   pnpm run dev"