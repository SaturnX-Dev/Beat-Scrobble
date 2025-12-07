import { useCallback, useState } from 'react';

/**
 * useOptimistic - Hook for optimistic UI updates
 * Updates UI immediately before server response, rolls back on error
 */
export function useOptimistic<T>(
    initialValue: T,
    onUpdate: (value: T) => Promise<void>
) {
    const [value, setValue] = useState<T>(initialValue);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const optimisticUpdate = useCallback(
        async (newValue: T) => {
            const previousValue = value;

            // Optimistically update UI immediately
            setValue(newValue);
            setIsPending(true);
            setError(null);

            try {
                await onUpdate(newValue);
            } catch (err) {
                // Rollback on error
                setValue(previousValue);
                setError(err instanceof Error ? err : new Error('Update failed'));
                throw err;
            } finally {
                setIsPending(false);
            }
        },
        [value, onUpdate]
    );

    return {
        value,
        setValue: optimisticUpdate,
        isPending,
        error,
        reset: () => setValue(initialValue),
    };
}

/**
 * useOptimisticMutation - For mutations with TanStack Query integration
 */
export function useOptimisticMutation<TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options?: {
        onMutate?: (variables: TVariables) => void;
        onSuccess?: (data: TData, variables: TVariables) => void;
        onError?: (error: Error, variables: TVariables) => void;
        onSettled?: () => void;
    }
) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(
        async (variables: TVariables) => {
            setIsPending(true);
            setError(null);

            // Call optimistic update callback
            options?.onMutate?.(variables);

            try {
                const data = await mutationFn(variables);
                options?.onSuccess?.(data, variables);
                return data;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Mutation failed');
                setError(error);
                options?.onError?.(error, variables);
                throw error;
            } finally {
                setIsPending(false);
                options?.onSettled?.();
            }
        },
        [mutationFn, options]
    );

    return {
        mutate,
        isPending,
        error,
    };
}

export default useOptimistic;
