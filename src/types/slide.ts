export interface Slide {
  id: number;
  magazineId: number | null;
  slotNumber: number | null;
  originalFilename: string | null;
  storagePath: string | null;
  thumbnailPath: string | null;
  mediumPath: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  checksum: string | null;
  title: string | null;
  dateTaken: string | null;
  dateTakenPrecise: string | null;
  location: string | null;
  notes: string | null;
  scanDate: string | null;
  exifData: Record<string, unknown> | null;
  searchVector: string | null;
  batchId: string | null;
  status: string;
  backedUp: boolean;
  backedUpAt: string | null;
  exifWritten: boolean;
  uploadedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SlidesResponse {
  success: boolean;
  slides: Slide[];
  pagination: PaginationInfo;
  query?: string;
}

export interface SlideResponse {
  success: boolean;
  slide: Slide;
}
