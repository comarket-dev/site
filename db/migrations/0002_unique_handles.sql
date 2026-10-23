-- A creator's handle is their page address (comarket.si/<handle>), so only one person can hold it.
-- Handles are stored lowercased by the API. If this fails, two signups share a handle: resolve them by hand first.
create unique index if not exists waitlist_creator_handle on waitlist (lower(handle)) where side = 'creator';
