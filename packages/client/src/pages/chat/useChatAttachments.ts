import { useEffect, useRef, useState } from 'react';
import type { Attachment } from '@/stores/chat';
import { readFileAsBase64 } from './chatPageUtils';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 5;
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['.md']);

export interface UseChatAttachmentsResult {
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeAttachment: (id: string) => void;
}

function isAllowedAttachment(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const extension = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
  return ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type) || ALLOWED_ATTACHMENT_EXTENSIONS.has(extension);
}

function getAttachmentSizeBytes(attachment: Attachment): number {
  return attachment.sizeBytes ?? 0;
}

function appendWithinLimits(current: Attachment[], additions: Attachment[]): Attachment[] {
  let totalBytes = current.reduce((total, attachment) => total + getAttachmentSizeBytes(attachment), 0);
  const accepted: Attachment[] = [];

  for (const attachment of additions) {
    if (current.length + accepted.length >= MAX_ATTACHMENT_COUNT) break;
    const sizeBytes = getAttachmentSizeBytes(attachment);
    if (totalBytes + sizeBytes > MAX_TOTAL_ATTACHMENT_BYTES) continue;
    totalBytes += sizeBytes;
    accepted.push(attachment);
  }

  const acceptedUrls = new Set(accepted.map((attachment) => attachment.url).filter(Boolean));
  additions.forEach((attachment) => {
    if (attachment.url && !acceptedUrls.has(attachment.url)) URL.revokeObjectURL(attachment.url);
  });

  return [...current, ...accepted];
}

export function useChatAttachments(): UseChatAttachmentsResult {
  const [attachments, setAttachmentsState] = useState<Attachment[]>([]);
  const attachmentsRef = useRef<Attachment[]>([]);

  const setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>> = (nextAttachments) => {
    setAttachmentsState((current) => {
      const next = typeof nextAttachments === 'function' ? nextAttachments(current) : nextAttachments;
      const nextUrls = new Set(next.map((attachment) => attachment.url).filter(Boolean));
      current.forEach((attachment) => {
        if (attachment.url && !nextUrls.has(attachment.url)) URL.revokeObjectURL(attachment.url);
      });
      attachmentsRef.current = next;
      return next;
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    try {
      let nextTotalBytes = attachments.reduce((total, attachment) => total + getAttachmentSizeBytes(attachment), 0);
      const availableSlots = Math.max(0, MAX_ATTACHMENT_COUNT - attachments.length);

      for (const file of Array.from(files).slice(0, availableSlots)) {
        if (file.size > MAX_ATTACHMENT_BYTES || !isAllowedAttachment(file) || nextTotalBytes + file.size > MAX_TOTAL_ATTACHMENT_BYTES) continue;
        const data = await readFileAsBase64(file);
        nextTotalBytes += file.size;
        newAttachments.push({
          id: crypto.randomUUID(),
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name,
          url: URL.createObjectURL(file),
          mimeType: file.type,
          data,
          sizeBytes: file.size,
        });
      }

      setAttachments((current) => appendWithinLimits(current, newAttachments));
    } catch (error) {
      newAttachments.forEach((attachment) => {
        if (attachment.url) URL.revokeObjectURL(attachment.url);
      });
      throw error;
    } finally {
      event.target.value = '';
    }
  };

  const removeAttachment = (id: string): void => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  };

  useEffect(() => () => {
    attachmentsRef.current.forEach((attachment) => {
      if (attachment.url) URL.revokeObjectURL(attachment.url);
    });
  }, []);

  return {
    attachments,
    setAttachments,
    handleFileSelect,
    removeAttachment,
  };
}
