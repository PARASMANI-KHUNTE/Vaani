export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const DEFAULT_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const DEFAULT_AUDIO_TYPES = ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"];
const DEFAULT_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export const ALL_ALLOWED_TYPES = [
  ...DEFAULT_IMAGE_TYPES,
  ...DEFAULT_VIDEO_TYPES,
  ...DEFAULT_AUDIO_TYPES,
  ...DEFAULT_DOCUMENT_TYPES,
];

export const validateFile = (
  file: File,
  options: FileValidationOptions = {}
): FileValidationResult => {
  const {
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    allowedTypes = ALL_ALLOWED_TYPES,
  } = options;

  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed`,
    };
  }

  const fileNameLower = file.name.toLowerCase();
  const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".php", ".phtml", ".asp", ".aspx", ".jsp", ".jar"];
  for (const ext of dangerousExtensions) {
    if (fileNameLower.endsWith(ext)) {
      return {
        valid: false,
        error: "This file type is not allowed for security reasons",
      };
    }
  }

  return { valid: true };
};

export const validateImage = (file: File): FileValidationResult => {
  return validateFile(file, {
    allowedTypes: DEFAULT_IMAGE_TYPES,
    maxSizeMB: 5,
  });
};

export const validateVideo = (file: File): FileValidationResult => {
  return validateFile(file, {
    allowedTypes: DEFAULT_VIDEO_TYPES,
    maxSizeMB: 50,
  });
};

export const validateAudio = (file: File): FileValidationResult => {
  return validateFile(file, {
    allowedTypes: DEFAULT_AUDIO_TYPES,
    maxSizeMB: 10,
  });
};

export const validateDocument = (file: File): FileValidationResult => {
  return validateFile(file, {
    allowedTypes: DEFAULT_DOCUMENT_TYPES,
    maxSizeMB: 10,
  });
};

export const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : "";
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const isImageFile = (file: File): boolean => {
  return DEFAULT_IMAGE_TYPES.includes(file.type);
};

export const isVideoFile = (file: File): boolean => {
  return DEFAULT_VIDEO_TYPES.includes(file.type);
};

export const isAudioFile = (file: File): boolean => {
  return DEFAULT_AUDIO_TYPES.includes(file.type);
};

export const isDocumentFile = (file: File): boolean => {
  return DEFAULT_DOCUMENT_TYPES.includes(file.type);
};
