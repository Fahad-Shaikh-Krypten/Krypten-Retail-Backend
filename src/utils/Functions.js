

export function tryCatchWrapper(asyncFunction) {
    return async (req, res, next) => {
        try {
            await asyncFunction(req, res, next);
        } catch (error) {
            console.error("Error caught in tryCatchWrapper:", error);

            // Handle specific error types
            if (error.statusCode) {
                // Use the status code and message from the error if available
                res.status(error.statusCode).json({ success: false, error: error.error || "Error occurred" });
            } else {
                // Default to 500 if no status code is provided
                res.status(500).json({ success: false, error: "Server error" });
            }
        }
    };
}
