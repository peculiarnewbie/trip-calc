ALTER TABLE `people` ADD COLUMN `payment_methods` text NOT NULL DEFAULT '[]';

UPDATE `people`
SET `payment_methods` = json_array(json_object(
  'method', 'Payment details',
  'destination', trim(`payment_info`)
))
WHERE `payment_info` IS NOT NULL AND trim(`payment_info`) <> '';
