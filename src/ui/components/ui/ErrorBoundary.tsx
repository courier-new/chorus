import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";
import { AlertCircleIcon, ArrowRightIcon } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Save errorInfo to state so we can show it in UI
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        // Navigate to root route by updating window.location
        window.location.href = "/";

        // Reset error state
        this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined,
        });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen p-4 gap-4 bg-background">
                    <AlertCircleIcon className="w-12 h-12 text-foreground-accent" />
                    <h2 className="text-2xl font-extralight text-foreground">
                        Uh-oh, something went wrong! :(
                    </h2>
                    {this.state.error && (
                        <p className="bg-muted p-4 rounded-lg font-mono text-muted-foreground w-2/3 max-w-[700px] min-w-full md:min-w-[400px]">
                            Error: {this.state.error.message}
                        </p>
                    )}
                    <Button
                        className="mt-4 flex items-center group/reload-button"
                        onClick={this.handleReload}
                    >
                        Go to Home Screen
                        <ArrowRightIcon className="!size-4 group-hover/reload-button:translate-x-1 transition-transform duration-200" />
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
