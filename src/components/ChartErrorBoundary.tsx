'use client';

import React from 'react';

interface ChartErrorBoundaryProps {
    children: React.ReactNode;
}

interface ChartErrorBoundaryState {
    hasError: boolean;
}

class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
    constructor(props: ChartErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ChartErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Chart Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                    Chart could not be rendered
                </div>
            );
        }

        return this.props.children;
    }
}

export default ChartErrorBoundary;
