export interface ChatPartText {
  type: "text";
  text: string;
}

export interface ChatPartImageUrl {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}

export interface ChatPartFile {
  type: "file";
  file: {
    filename: string;
    file_data: string;
  };
}

export type ChatPart = ChatPartText | ChatPartImageUrl | ChatPartFile;

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string | ChatPart[];
}

export interface AiExecutionOptions {
  operationId?: string;
  companyId?: string;
  modality?: "text" | "audio" | "image" | "pdf" | "embedding";
  forceProvider?: string;
  forceModel?: string;
  temperature?: number;
}
