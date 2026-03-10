type FirebaseErrorDetails = {
  [key: string]: unknown;
};

type ErrorUtilsGlobalHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsLike = {
  getGlobalHandler?: () => ErrorUtilsGlobalHandler;
  setGlobalHandler?: (handler: ErrorUtilsGlobalHandler) => void;
};

type FirebaseErrorLike = Error & {
  code?: string;
  customData?: unknown;
  nativeErrorCode?: string | number;
  nativeErrorMessage?: string;
  userInfo?: unknown;
};

function isFirebaseErrorLike(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const firebaseError = error as FirebaseErrorLike;

  if (typeof firebaseError.code === 'string' && firebaseError.code.includes('/')) {
    return true;
  }

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  return (
    message.includes('firebase') ||
    message.includes('firestore') ||
    message.includes('auth/') ||
    message.includes('storage/') ||
    message.includes('messaging/') ||
    name.includes('firebase')
  );
}

export function serializeFirebaseError(error: unknown) {
  if (error instanceof Error) {
    const firebaseError = error as FirebaseErrorLike;

    return {
      code: firebaseError.code ?? null,
      customData: firebaseError.customData ?? null,
      message: firebaseError.message,
      name: firebaseError.name,
      nativeErrorCode: firebaseError.nativeErrorCode ?? null,
      nativeErrorMessage: firebaseError.nativeErrorMessage ?? null,
      stack: firebaseError.stack ?? null,
      userInfo: firebaseError.userInfo ?? null,
    };
  }

  return {
    message: 'Unknown Firebase error',
    value: error,
  };
}

export function logFirebaseError(
  context: string,
  details: FirebaseErrorDetails,
  error: unknown,
) {
  console.error(`[Firebase] ${context}`, {
    ...details,
    error: serializeFirebaseError(error),
  });
}

export function installGlobalFirebaseErrorLogging() {
  const globalState = globalThis as typeof globalThis & {
    __atlasbFirebaseDebugInstalled?: boolean;
    ErrorUtils?: ErrorUtilsLike;
    addEventListener?: (
      eventName: string,
      listener: (event: { reason?: unknown }) => void,
    ) => void;
    onunhandledrejection?: ((event: { reason?: unknown }) => void) | null;
  };

  if (globalState.__atlasbFirebaseDebugInstalled) {
    return;
  }

  globalState.__atlasbFirebaseDebugInstalled = true;

  const errorUtils = globalState.ErrorUtils;
  const existingGlobalHandler = errorUtils?.getGlobalHandler?.();

  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    if (isFirebaseErrorLike(error)) {
      logFirebaseError(
        'Global JS exception handler caught Firebase error',
        { isFatal: isFatal === true },
        error,
      );
    }

    existingGlobalHandler?.(error, isFatal);
  });

  const handleUnhandledRejection = (event: { reason?: unknown }) => {
    if (isFirebaseErrorLike(event.reason)) {
      logFirebaseError(
        'Global unhandled promise rejection caught Firebase error',
        {},
        event.reason,
      );
    }
  };

  if (typeof globalState.addEventListener === 'function') {
    globalState.addEventListener('unhandledrejection', handleUnhandledRejection);
    return;
  }

  const previousUnhandledRejection = globalState.onunhandledrejection;
  globalState.onunhandledrejection = event => {
    handleUnhandledRejection(event);
    previousUnhandledRejection?.(event);
  };
}
