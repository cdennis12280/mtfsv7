export interface ERPOverlayPayload {
  sourceName: string;
  mappedValues: Record<string, number>;
  unmappedFields: string[];
}

export interface ERPSourceAdapter {
  id: string;
  label: string;
  importOverlay(file: File, mapping: Record<string, string>): Promise<ERPOverlayPayload>;
}

/**
 * Adapter boundary for future ERP connectors/APIs.
 * Phase 1 uses spreadsheet-based overlay imports only.
 */
export const SpreadsheetOverlayAdapter: ERPSourceAdapter = {
  id: 'spreadsheet',
  label: 'Spreadsheet Import',
  async importOverlay() {
    throw new Error('SpreadsheetOverlayAdapter is handled in-panel during Phase 1.');
  },
};

