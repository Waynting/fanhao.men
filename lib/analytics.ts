// Google Analytics 4 event tracking utilities

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
  }
}

/**
 * Send a custom event to Google Analytics
 * @param eventName - The name of the event (e.g., 'add_to_playlist')
 * @param eventParams - Additional parameters for the event
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventParams);
  }
};

// Predefined event tracking functions for common actions

/**
 * Track when user adds items to a playlist
 */
export const trackAddItems = (params: {
  playlist_id: string;
  item_count: number;
  method: "single" | "bulk" | "url_parse";
}) => {
  trackEvent("add_items_to_playlist", params);
};

/**
 * Track when user generates links
 */
export const trackGenerateLinks = (params: {
  source_name: string;
  item_count: number;
  is_single_item: boolean;
}) => {
  trackEvent("generate_links", params);
};

/**
 * Track when user copies codes
 */
export const trackCopyCodes = (params: {
  item_count: number;
  has_selection: boolean;
}) => {
  trackEvent("copy_codes", params);
};

/**
 * Track when user creates a playlist
 */
export const trackCreatePlaylist = (params: {
  playlist_id: string;
  has_description: boolean;
}) => {
  trackEvent("create_playlist", params);
};

/**
 * Track when user deletes items
 */
export const trackDeleteItems = (params: {
  playlist_id: string;
  item_count: number;
}) => {
  trackEvent("delete_items", params);
};

/**
 * Track when user shares a playlist
 */
export const trackSharePlaylist = (params: {
  playlist_id: string;
  method: "copy_link" | "view_share_page";
}) => {
  trackEvent("share_playlist", params);
};

/**
 * Track when user adds items from a shared playlist
 */
export const trackAddFromSharedPlaylist = (params: {
  source_playlist_id: string;
  target_playlist_id: string;
  item_count: number;
}) => {
  trackEvent("add_from_shared_playlist", params);
};

/**
 * Track when user updates playlist item note
 */
export const trackUpdateNote = (params: {
  playlist_id: string;
  has_note: boolean;
}) => {
  trackEvent("update_note", params);
};

/**
 * Track when user creates a source template
 */
export const trackCreateTemplate = (params: {
  template_id: string;
  is_default: boolean;
}) => {
  trackEvent("create_template", params);
};

