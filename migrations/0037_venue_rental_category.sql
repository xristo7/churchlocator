-- Brief 12: add the "Venue rental" store category for church and organization hall listings.
-- Appends to the owner-managed list only when it is missing; existing categories are left untouched.
update platform_taxonomies
   set items_json = json_insert(items_json, '$[#]', 'Venue rental'),
       revision = revision + 1,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
 where key = 'product_categories'
   and not exists (select 1 from json_each(platform_taxonomies.items_json) where value = 'Venue rental');
