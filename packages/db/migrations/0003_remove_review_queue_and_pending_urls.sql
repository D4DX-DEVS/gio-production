-- The admin no longer has the "Client questions" queue or the "Old addresses" decision screen.
-- Drop the review queue, and delete the old addresses that were still waiting for a decision.
-- Addresses that are kept at the same path (same_path) stay: the public site still reads them.
DROP TABLE `review_items`;--> statement-breakpoint
UPDATE `redirects` SET `legacy_url_id` = NULL WHERE `legacy_url_id` IN (SELECT `id` FROM `legacy_urls` WHERE `action` = 'pending_decision');--> statement-breakpoint
DELETE FROM `legacy_urls` WHERE `action` = 'pending_decision';
