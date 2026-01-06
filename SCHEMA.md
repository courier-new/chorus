# Database Schema

_This file is auto-generated from migrations.rs. Do not edit manually. Regenerate with `pnpm run generate-schema`._

Last updated: 2026-01-05 22:18:36

## Tables

-   [app_metadata](#app_metadata)
-   [attachments](#attachments)
-   [chats](#chats)
-   [custom_toolsets](#custom_toolsets)
-   [draft_attachments](#draft_attachments)
-   [message_attachments](#message_attachments)
-   [message_drafts](#message_drafts)
-   [message_parts](#message_parts)
-   [message_sets](#message_sets)
-   [messages](#messages)
-   [model_configs](#model_configs)
-   [model_groups](#model_groups)
-   [models](#models)
-   [project_attachments](#project_attachments)
-   [projects](#projects)
-   [saved_model_configs_chats](#saved_model_configs_chats)
-   [tool_permissions](#tool_permissions)
-   [toolsets_config](#toolsets_config)

## app_metadata

| Column     | Type     | Constraints | Default           |
| ---------- | -------- | ----------- | ----------------- |
| key        | TEXT     | PRIMARY KEY | -                 |
| value      | TEXT     | NOT NULL    | -                 |
| created_at | DATETIME | -           | CURRENT_TIMESTAMP |

## attachments

| Column        | Type     | Constraints | Default           |
| ------------- | -------- | ----------- | ----------------- |
| id            | TEXT     | PRIMARY KEY | -                 |
| created_at    | DATETIME | NOT NULL    | CURRENT_TIMESTAMP |
| type          | TEXT     | NOT NULL    | -                 |
| is_loading    | BOOLEAN  | NOT NULL    | 0                 |
| original_name | TEXT     | -           | -                 |
| path          | TEXT     | NOT NULL    | -                 |
| ephemeral     | BOOLEAN  | NOT NULL    | 0                 |

## chats

| Column                           | Type     | Constraints          | Default           |
| -------------------------------- | -------- | -------------------- | ----------------- |
| id                               | TEXT     | NOT NULL PRIMARY KEY | -                 |
| title                            | TEXT     | -                    | -                 |
| created_at                       | DATETIME | -                    | CURRENT_TIMESTAMP |
| updated_at                       | DATETIME | -                    | -                 |
| pinned                           | BOOLEAN  | NOT NULL             | 0                 |
| quick_chat                       | BOOLEAN  | NOT NULL             | 0                 |
| project_id                       | TEXT     | NOT NULL             | 'default'         |
| summary                          | TEXT     | -                    | -                 |
| is_new_chat                      | BOOLEAN  | NOT NULL             | 0                 |
| parent_chat_id                   | TEXT     | -                    | -                 |
| project_context_summary          | TEXT     | -                    | -                 |
| project_context_summary_is_stale | BOOLEAN  | NOT NULL             | 1                 |
| reply_to_id                      | TEXT     | -                    | -                 |
| total_cost_usd                   | REAL     | -                    | 0.0               |

### Indices

-   **idx_chats_is_new_chat**
    -   Columns: is_new_chat
-   **idx_chats_pinned**
    -   Columns: pinned
-   **idx_chats_project_cost**
    -   Columns: project_id, total_cost_usd

## custom_toolsets

| Column             | Type     | Constraints | Default           |
| ------------------ | -------- | ----------- | ----------------- |
| name               | TEXT     | PRIMARY KEY | -                 |
| command            | TEXT     | -           | -                 |
| args               | TEXT     | -           | -                 |
| env                | JSON     | -           | -                 |
| updated_at         | DATETIME | -           | CURRENT_TIMESTAMP |
| default_permission | TEXT     | NOT NULL    | 'ask'             |

## draft_attachments

| Column        | Type | Constraints          | Default |
| ------------- | ---- | -------------------- | ------- |
| chat_id       | TEXT | NOT NULL PRIMARY KEY | -       |
| attachment_id | TEXT | NOT NULL PRIMARY KEY | -       |

## message_attachments

| Column        | Type | Constraints          | Default |
| ------------- | ---- | -------------------- | ------- |
| message_id    | TEXT | NOT NULL PRIMARY KEY | -       |
| attachment_id | TEXT | NOT NULL PRIMARY KEY | -       |

## message_drafts

| Column  | Type | Constraints | Default |
| ------- | ---- | ----------- | ------- |
| chat_id | TEXT | PRIMARY KEY | -       |
| content | TEXT | NOT NULL    | -       |

## message_parts

| Column       | Type    | Constraints          | Default |
| ------------ | ------- | -------------------- | ------- |
| chat_id      | TEXT    | NOT NULL             | -       |
| message_id   | TEXT    | NOT NULL PRIMARY KEY | -       |
| level        | INTEGER | NOT NULL PRIMARY KEY | -       |
| content      | TEXT    | NOT NULL             | -       |
| tool_calls   | TEXT    | -                    | -       |
| tool_results | TEXT    | -                    | -       |

## message_sets

| Column              | Type     | Constraints | Default           |
| ------------------- | -------- | ----------- | ----------------- |
| id                  | TEXT     | PRIMARY KEY | -                 |
| chat_id             | TEXT     | NOT NULL    | -                 |
| type                | TEXT     | NOT NULL    | -                 |
| created_at          | DATETIME | -           | CURRENT_TIMESTAMP |
| selected_block_type | TEXT     | NOT NULL    | 'chat'            |
| level               | INTEGER  | -           | -                 |

### Indices

-   **idx_message_sets_chat_level**
    -   Columns: chat_id, level

## messages

| Column            | Type     | Constraints | Default           |
| ----------------- | -------- | ----------- | ----------------- |
| id                | TEXT     | PRIMARY KEY | -                 |
| message_set_id    | TEXT     | NOT NULL    | -                 |
| chat_id           | TEXT     | NOT NULL    | -                 |
| text              | TEXT     | NOT NULL    | -                 |
| model             | TEXT     | NOT NULL    | -                 |
| selected          | BOOLEAN  | -           | -                 |
| created_at        | DATETIME | -           | CURRENT_TIMESTAMP |
| streaming_token   | TEXT     | -           | -                 |
| state             | TEXT     | -           | 'streaming'       |
| error_message     | TEXT     | -           | -                 |
| block_type        | TEXT     | -           | -                 |
| level             | INTEGER  | -           | -                 |
| reply_chat_id     | TEXT     | -           | -                 |
| branched_from_id  | TEXT     | -           | -                 |
| prompt_tokens     | INTEGER  | -           | -                 |
| completion_tokens | INTEGER  | -           | -                 |
| total_tokens      | INTEGER  | -           | -                 |
| cost_usd          | REAL     | -           | -                 |
| is_collapsed      | BOOLEAN  | NOT NULL    | 0                 |
| instance_id       | TEXT     | -           | -                 |

### Indices

-   **idx_messages_chat_cost**
    -   Columns: chat_id, cost_usd

## model_configs

| Column           | Type     | Constraints | Default           |
| ---------------- | -------- | ----------- | ----------------- |
| id               | TEXT     | PRIMARY KEY | -                 |
| model_id         | TEXT     | NOT NULL    | -                 |
| display_name     | TEXT     | NOT NULL    | -                 |
| author           | TEXT     | NOT NULL    | -                 |
| created_at       | DATETIME | -           | CURRENT_TIMESTAMP |
| system_prompt    | TEXT     | NOT NULL    | -                 |
| is_default       | BOOLEAN  | -           | 0                 |
| budget_tokens    | INTEGER  | -           | -                 |
| reasoning_effort | TEXT     | -           | -                 |
| new_until        | DATETIME | -           | -                 |

## model_groups

| Column           | Type     | Constraints | Default           |
| ---------------- | -------- | ----------- | ----------------- |
| id               | TEXT     | PRIMARY KEY | -                 |
| name             | TEXT     | NOT NULL    | -                 |
| description      | TEXT     | -           | -                 |
| model_config_ids | TEXT     | NOT NULL    | -                 |
| created_at       | DATETIME | -           | CURRENT_TIMESTAMP |
| updated_at       | DATETIME | -           | CURRENT_TIMESTAMP |

## models

| Column                     | Type    | Constraints | Default |
| -------------------------- | ------- | ----------- | ------- |
| id                         | TEXT    | PRIMARY KEY | -       |
| display_name               | TEXT    | NOT NULL    | -       |
| is_enabled                 | BOOLEAN | -           | 1       |
| supported_attachment_types | TEXT    | NOT NULL    | -       |
| is_internal                | BOOLEAN | NOT NULL    | 0       |
| is_deprecated              | BOOLEAN | NOT NULL    | 0       |
| prompt_price_per_token     | REAL    | -           | -       |
| completion_price_per_token | REAL    | -           | -       |

## project_attachments

| Column        | Type | Constraints          | Default |
| ------------- | ---- | -------------------- | ------- |
| project_id    | TEXT | NOT NULL PRIMARY KEY | -       |
| attachment_id | TEXT | NOT NULL PRIMARY KEY | -       |

## projects

| Column                 | Type     | Constraints | Default           |
| ---------------------- | -------- | ----------- | ----------------- |
| id                     | TEXT     | PRIMARY KEY | -                 |
| name                   | TEXT     | NOT NULL    | -                 |
| created_at             | DATETIME | NOT NULL    | CURRENT_TIMESTAMP |
| updated_at             | DATETIME | NOT NULL    | CURRENT_TIMESTAMP |
| is_collapsed           | BOOLEAN  | NOT NULL    | 0                 |
| context_text           | TEXT     | -           | -                 |
| magic_projects_enabled | BOOLEAN  | NOT NULL    | 1                 |
| is_imported            | BOOLEAN  | NOT NULL    | 0                 |
| total_cost_usd         | REAL     | -           | 0.0               |

## saved_model_configs_chats

| Column     | Type     | Constraints          | Default           |
| ---------- | -------- | -------------------- | ----------------- |
| id         | TEXT     | NOT NULL PRIMARY KEY | -                 |
| chat_id    | TEXT     | -                    | -                 |
| model_ids  | TEXT     | NOT NULL             | -                 |
| created_at | DATETIME | -                    | CURRENT_TIMESTAMP |
| updated_at | DATETIME | -                    | CURRENT_TIMESTAMP |

### Indices

-   **idx_saved_model_configs_chats_chat_id**
    -   Columns: chat_id

## tool_permissions

| Column          | Type     | Constraints          | Default           |
| --------------- | -------- | -------------------- | ----------------- |
| toolset_name    | TEXT     | NOT NULL PRIMARY KEY | -                 |
| tool_name       | TEXT     | NOT NULL PRIMARY KEY | -                 |
| permission_type | TEXT     | NOT NULL             | -                 |
| last_asked_at   | DATETIME | -                    | -                 |
| last_response   | TEXT     | -                    | -                 |
| created_at      | DATETIME | -                    | CURRENT_TIMESTAMP |
| updated_at      | DATETIME | -                    | CURRENT_TIMESTAMP |

## toolsets_config

| Column          | Type | Constraints | Default |
| --------------- | ---- | ----------- | ------- |
| toolset_name    | TEXT | PRIMARY KEY | -       |
| parameter_id    | TEXT | PRIMARY KEY | -       |
| parameter_value | TEXT | -           | -       |
