export type MailFolder = "inbox" | "sent" | "drafts" | "important" | "archive" | "trash" | "spam";

export type MailMessage = {
  id: string;
  subject: string;
  body: string;
  senderName: string;
  senderId: string;
  recipientName?: string;
  recipientNames?: string[];
  createdAt: string;
  isRead: boolean;
  isNew: boolean;
  attachmentsCount: number;
  preview: string;
  isImportant?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
};

export type MailGroupRow = {
  ID: number;
  OnvanGroup: string;
  UserId?: number | string | null;
  Mahal?: number | string | null;
  CreateUserId?: number | string | null;
};

export type PickedRecipient = { id: number; title: string };
