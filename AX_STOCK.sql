-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: AX_STOCK_ALX_PROJECT1
-- ------------------------------------------------------
-- Server version	8.0.43-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `branch`
--

DROP TABLE IF EXISTS `branch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch` (
  `id` varchar(50) NOT NULL,
  `branch_name` varchar(16) NOT NULL,
  PRIMARY KEY (`branch_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch`
--

LOCK TABLES `branch` WRITE;
/*!40000 ALTER TABLE `branch` DISABLE KEYS */;
INSERT INTO `branch` VALUES ('628147fd-968c-42c2-96dd-d314a09e5c3f','Csk'),('5141b8ea-450e-4e77-9428-879ca8041d0c','Eto_Gesi'),('6430059d-eff0-4db0-b71d-90c35bd4e646','Town');
/*!40000 ALTER TABLE `branch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `id` varchar(50) NOT NULL,
  `name` varchar(32) NOT NULL,
  `percentage` varchar(12) DEFAULT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES ('03b3aca9-f572-4315-a42c-5409ce419518','Bag','9.09%'),('e0fa6e0d-92b5-426b-9153-1bbf004c7a58','Basic needs','6.25%'),('9415b232-2970-4a6f-95fe-f0771adf26f3','Basketball','7.41%'),('c89252be-828f-491c-85bb-cbdc46009312','Football','6.06%'),('59e533d7-3a1a-4e71-84e9-372bf6df7124','General','3.23%'),('cc4954f1-20d2-4359-a379-397b4d0d6ea8','General Clothes','11.54%'),('912242ec-c05a-4b6e-9dc2-7bc3b7967ee6','General Mechanics','11.11%'),('48fd66de-34b4-4545-b4c3-7647683901ce','Karate','9.80%'),('6434e874-a174-4ac5-9602-df83163c20ef','Shoes','0%'),('15e46c41-9abc-4682-bc45-171d1f981bc6','Swimming','53.33%'),('d740c09f-fb33-490b-9910-2cf4adbc7c60','Tennis','40.00%'),('12087b79-22b0-41c7-bfce-a63d442a6d48','Volleyball','1.15%');
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` varchar(50) NOT NULL,
  `name` varchar(64) NOT NULL,
  `category_name` varchar(32) NOT NULL,
  `inventory_quantity` int NOT NULL DEFAULT '0',
  `incoming_time_stamp` datetime DEFAULT NULL,
  `recent_entry` int DEFAULT '0',
  `recent_entry_at` datetime DEFAULT NULL,
  PRIMARY KEY (`name`),
  KEY `category_name` (`category_name`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`category_name`) REFERENCES `category` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES ('bc2e97e5-3cdf-4dc2-b24c-11b16bd610fe','AB Wheeler ','General Mechanics',4,'2024-07-29 13:32:40',0,NULL),('a5c9a900-478f-4222-b8c7-406d0e1898fd','Adidas football ','Football',1,'2025-04-13 19:19:25',0,NULL),('fee26cce-5381-4069-aa10-96ec2ee8c06f','All-star Ball','Basketball',0,'2024-07-29 14:01:17',0,NULL),('c49d3b95-2a84-4a95-bb9e-a3eff26cb2c8','Amavubi [Small,Adult]','Football',22,'2024-07-29 13:56:56',0,NULL),('02e51b90-19cb-4586-8bb9-3aa9f6f93e97','Ankle Support ','General',34,'2024-07-29 12:56:41',0,NULL),('5d38bc69-f08d-4664-8527-03d277960042','Aparei','Football',8,'2024-07-29 13:38:28',0,NULL),('7d12cfd5-6e63-4a30-abca-a5a5b5f65e76','Arms Floater','Swimming',10,'2024-07-29 13:35:56',0,NULL),('3f93bb2f-383c-4350-b5af-e2654cf53196','Arsenal-Small','Football',29,'2024-07-29 13:49:59',0,NULL),('4fdc16d6-606b-47cb-a244-1f106e01be6a','Bag','Bag',35,'2024-07-29 13:20:35',0,NULL),('64ce9284-f725-4da7-a11e-3a1b827a3dae','Bag godio','Football',2,'2025-04-13 19:47:34',0,NULL),('7e77227d-84f5-4dda-b380-b897a543da22','Barca Small','Football',18,'2024-07-29 13:51:04',0,NULL),('7306c016-391c-4ec0-9992-8c471e5533fa','Basketball Jersey','Basketball',7,'2024-07-29 13:37:34',0,NULL),('c6283ab8-d24a-41f5-a1a4-adff171607e5','Basketball net_fake','Basketball',3,'2024-07-29 13:04:41',0,NULL),('83652991-163a-4bef-bf2f-a7c617aca270','Basketball net_og','Basketball',2,'2024-07-29 13:04:30',0,NULL),('059f7b6b-f9aa-474d-8123-147138995f8d','Basketball original ','Basketball',0,'2025-04-13 19:15:03',0,NULL),('5766551e-78b8-4d2e-a1f9-915e0eb113ce','Bayern Munich-Small','Football',3,'2024-07-29 13:52:39',0,NULL),('f0815df0-17db-4f3f-882d-ae15644d0bde','Bicycles','General Mechanics',-1,'2024-07-29 13:34:17',0,NULL),('73de0265-2860-4464-a14a-b8f7ec96fcb9','C-Arm Band','Football',10,'2024-07-29 13:04:00',0,NULL),('2a82f0b4-b9d6-402c-95fc-950ff7bdd1cc','Cap','Swimming',194,'2024-07-29 13:09:20',0,NULL),('50b919fd-206d-4e06-82e9-11210a9cf982','Cap_Fake','Swimming',0,'2024-07-29 13:08:51',0,NULL),('638527f7-8631-4cc6-93be-846597cd2679','Cosco Ball','Football',11,'2024-07-29 14:09:07',0,NULL),('0a72955a-c1b5-4b32-b586-b6f50dcc090d','Dunlop-All Court','Tennis',43,'2024-07-29 12:50:36',0,NULL),('a7573c83-76d6-4e6d-9cce-99007807ae6a','Exp','General',5,'2025-04-02 20:19:50',0,NULL),('e34e0cc4-1a81-4c13-9d31-ee69180365ec','Fake Arms Floater','Swimming',2,'2024-08-31 17:07:15',0,NULL),('0cda68b0-cbe7-42d2-8f1b-80f0c2645643','Fighter Ball','Football',3,'2024-07-29 14:05:24',0,NULL),('ef5619cc-7f64-4a69-98e8-454cddd9af3c','Fins','Swimming',16,'2024-07-29 13:02:22',0,NULL),('5081208a-0221-4fdc-8f39-32a1fdc914c2','Floaterboard','Swimming',-1,'2024-12-28 18:38:02',0,NULL),('44928c00-b137-4ea7-9ae1-e1c8d188993c','Football Boots','Football',63,'2024-07-29 13:15:28',0,NULL),('f3a7db2d-862c-45c5-9024-366e9115db70','Football Boots_2nd','Football',61,'2024-07-29 13:14:18',0,NULL),('ad171134-17bc-422a-b806-9e47fed24717','Football Boots_Fake','Football',22,'2024-07-29 13:15:49',0,NULL),('7be4a535-aaf7-44fe-ae01-8e461fab4168','FootballNet','Football',1,'2024-07-29 13:35:24',0,NULL),('16c12339-75b1-4b5c-9e59-2bdbfcb6bfca','Fox 40','General',5,'2024-07-29 13:00:53',0,NULL),('88537c25-9ad8-478d-9be7-af32dde371ee','Goalkeeper Gloves','Football',3,'2024-07-29 12:57:22',0,NULL),('b7da40c3-50ca-4ac0-b4d6-28b370f552a3','Goalkeeper gloves small','Football',2,'2025-04-13 19:33:10',0,NULL),('693d5b70-1cac-497d-8006-b86aa2ba2cdb','Goggles Big','Swimming',151,'2024-07-29 13:12:10',0,NULL),('8122e737-7e10-40b9-b135-1625e0d87ecf','Goggles Large','General Clothes',12,'2024-07-29 13:31:36',0,NULL),('eb51142d-01ff-42ee-ac12-cafc70ad7c9a','Goggles Medium','Swimming',73,'2024-07-29 13:12:32',0,NULL),('ae3bb315-804d-4816-934c-e98e232bf998','Goggles Small','Swimming',16,'2024-07-29 13:13:05',0,NULL),('3fbe9a0e-db47-4f6d-b1e6-8a81c01e16d7','Gym Gloves','General',89,'2024-07-29 12:53:48',0,NULL),('c256b55b-b289-4738-b85e-1bdca87d754a','Hand Grip_Fake','General',5,'2024-07-29 13:03:03',0,NULL),('d65f5810-02f7-4773-a359-b70598ffe005','Hand Grip_og','General',4,'2024-07-29 12:58:34',0,NULL),('a0e15a7a-5b5e-4c9c-9c18-c0f63e9a9979','Handband','Tennis',12,'2025-04-13 19:40:45',0,NULL),('c71ff5fb-b4d8-4836-a8cb-280a55c6da2b','Head Band','Tennis',11,'2024-07-29 13:01:21',0,NULL),('8e68fded-f623-4bf0-834a-1354f6e69b64','HMK 1000','Football',2,'2024-07-29 14:09:24',0,NULL),('38a91485-01c5-4aae-b269-ab9cc0441a11','Huafeiyang Ball','Football',2,'2024-07-29 14:05:05',0,NULL),('d22fbc8d-3eaf-4e15-bbb2-c5c5a52a06ac','incomplete Error','Football',4,'2024-07-29 13:54:12',0,NULL),('5bcc23ca-6dfe-42e0-a246-3a334819861a','Inter Miami-Small','Football',-1,'2024-07-29 13:51:55',0,NULL),('6f328b60-dcb3-49c5-9c15-da92b4a4fa0d','International-Jersey','Football',1,'2024-07-29 13:49:24',0,NULL),('bacbad51-ec57-4666-aa73-715dca433b9b','Isuime','General',25,'2024-07-29 13:25:08',0,NULL),('b2177d6f-417e-4fbd-8fb6-905b172f96be','Jacket','General Clothes',13,'2024-07-29 13:26:42',0,NULL),('f4b241d9-8b27-4fb9-a96d-ca2a204a7bb5','Jacket Floater','Swimming',6,'2024-07-29 19:19:55',0,NULL),('f7e0981d-06bc-4940-b5ab-a727d16f8499','Jersey masita ','Football',19,'2024-12-28 18:31:27',0,NULL),('f1f4bde4-3ad0-448b-8931-1f2f7fcf0d2b','Jumping Rope','General Mechanics',3,'2024-07-29 13:03:28',0,NULL),('46dd6cb9-74ac-46d5-95dc-ccebe4e3eda2','Kangaroo','Football',1,'2024-07-29 19:20:53',0,NULL),('dc638e1d-20ee-4661-bfef-98c95dd03077','Karate Belt','Karate',45,'2024-07-29 16:20:33',0,NULL),('947db366-b90d-4ac9-b2f7-6f4ca4145890','Karere','Football',4,'2025-07-24 18:25:21',0,NULL),('a1ac3ee7-cd8e-4b40-9fe8-400e7ef9847d','Kimono','Karate',75,'2024-07-29 16:20:14',0,NULL),('7526e084-e099-49e6-93ea-f611a01e922b','Knee Support','General',7,'2024-07-29 12:56:15',0,NULL),('bfa0dc6e-95c8-479d-a7da-d79bd2b645e9','Kora ','General',42,'2024-07-29 13:25:46',0,NULL),('cde48974-853f-4b1f-bcb4-91f0e39ac957','Kora Arms','General',9,'2024-07-29 13:26:08',0,NULL),('125b43b1-1ec7-4c89-8608-72964541bf32','Leggings','General Clothes',20,'2024-07-29 13:31:04',0,NULL),('f99d3fb3-2450-401f-8ae7-76e697646f1f','Liverpool Small','Football',2,'2024-07-29 13:51:19',0,NULL),('12a4695a-c556-4e98-80dd-709850380c8d','Manchester United-Small','Football',9,'2024-07-29 13:50:34',0,NULL),('c1d23948-46f9-438c-8ef1-658aab8bdaf0','Mancity Small','Football',3,'2024-07-29 13:51:35',0,NULL),('7a9fbb3c-3bda-4ca2-a60a-90ac62edb867','Medal','General',0,'2024-11-29 20:01:18',0,NULL),('1bbab57a-203a-430a-a6eb-97434f70a393','Men\'s Complete','Football',8,'2024-07-29 13:48:01',0,NULL),('17cd50d3-f95d-4805-b4fa-c241458fdf72','Men\'s Swimming Complete','Swimming',0,'2024-07-29 13:58:33',0,NULL),('a5bc465f-4881-4d2e-aba8-80fde29f85c5','Mikasa','Volleyball',3,'2024-07-29 14:02:51',0,NULL),('733dcb76-4997-4843-85c9-66da91b23f6d','Molten Basketball (7)','Basketball',4,'2024-07-29 14:00:44',0,NULL),('fbf9e923-9668-4ada-b038-9293b60b5071','Molten Football','Football',1,'2024-07-29 14:06:38',0,NULL),('84d4e500-56cc-4bfc-80a5-9d8b8c340ca1','Molten original ','Football',0,'2025-04-13 19:17:10',0,NULL),('fd1c3ecd-ec41-433d-a353-7a8a73846d87','Molten/Mikasa(5) Ball','Basketball',0,'2024-07-29 14:01:37',0,NULL),('a5798254-47b7-4639-9fad-4198a6254f1e','NBA-Jersey','Basketball',2,'2024-07-29 13:38:14',0,NULL),('1208235d-9157-47d3-bc4c-200dfab805ef','New Season Jersey','Football',6,'2024-07-29 15:44:23',0,NULL),('e31ed84a-85a7-4087-8af8-28ae0efd81c3','Noodles ','Swimming',7,'2024-08-25 10:38:19',0,NULL),('08bf63d5-401c-485a-90fb-6b65988f8df1','Nose clip','Swimming',37,'2024-07-29 13:13:24',0,NULL),('63f163c9-4d1b-4589-b3fb-9428c6a55709','Nose clip big','Swimming',6,'2025-04-13 19:43:29',0,NULL),('45883110-f6f6-4e12-a2f0-46907aab6a3d','O.M','Football',1,'2024-09-15 19:41:58',0,NULL),('f2e9356c-21ad-45f4-a31b-8c8d77ae70dd','Old-Season','Football',28,'2024-07-29 13:53:05',0,NULL),('19c5e491-8c65-45dd-800b-2988002cca9d','Pele','Football',1,'2024-10-11 20:39:00',0,NULL),('2ce802ce-8703-4953-844d-ee2a5d4ffe41','Pingpong racket ','General Mechanics',7,'2024-12-30 16:08:49',0,NULL),('8b3ab188-4ac1-4c6a-84b8-bbf14e2acb55','Pins','Basic needs',188,'2025-06-04 14:36:11',0,NULL),('d3f446f1-9b74-4916-80a5-6e52ba2023bc','Pk t shirt','General',3,'2025-07-15 11:40:52',0,NULL),('f717ad4a-a088-4298-bafc-58325cf0f32f','Premier-League Ball','Football',3,'2024-07-29 14:07:31',0,NULL),('e7addee5-908f-4a50-a9fc-c3748f3be846','Psg-Small','Football',4,'2024-07-29 13:52:20',0,NULL),('e9174391-d516-4795-82fd-b9b8360a2157','Pump-Big','General Mechanics',4,'2024-07-29 13:59:05',0,NULL),('d685b1f4-947d-434c-9ad5-86aa2f01da50','Pump-Small','General Mechanics',4,'2024-07-29 13:59:20',0,NULL),('1214a366-c2c7-4496-a2f1-5bd424dd1dd7','Racket','Tennis',1,'2024-07-29 13:48:55',0,NULL),('c5173317-f1ad-4ceb-90b0-2170643d5817','RayonSport Jersey','Football',23,'2024-07-29 13:53:49',0,NULL),('16f4e989-f97a-475f-940e-c679cf641785','Real Madrid small','Football',16,'2024-09-15 19:40:33',0,NULL),('82c5062c-619e-4b31-af91-e91c5e8307ce','Revo flex','General Mechanics',3,'2024-07-29 12:52:41',0,NULL),('f7b0b53b-e00a-43d3-a100-44d44f5bfc79','Rims','Basketball',4,'2025-06-05 14:51:03',0,NULL),('1aea88e9-bf70-4e4b-b6a8-5a88e39a9807','Ring basket ','Basketball',2,'2025-07-05 17:41:49',0,NULL),('de969ed8-ce41-40ea-9e1b-64640347b8eb','Ring Floater','Swimming',57,'2024-07-29 13:36:33',0,NULL),('1208eabf-3f61-4957-a8f2-6b75707ee962','Rwanda ','Football',16,'2024-07-29 13:56:24',0,NULL),('be10c4e1-4224-44bf-ba42-9b6b243cdeb2','Rwanda(House Of Tayo)','Football',13,'2024-07-29 13:54:48',0,NULL),('2c0e9a3b-07cf-411c-8c3d-d511ac0fd215','Sarson','Football',3,'2024-07-29 14:08:23',0,NULL),('30844395-c853-4322-a36a-ca9b1c1cbeb6','Select-Cat1','Football',0,'2024-07-29 14:05:55',0,NULL),('3dffa9ed-584f-4d22-9fc5-c56d8ba2f85b','Select-Cat2','Football',3,'2024-07-29 14:06:58',0,NULL),('49ef42c7-8dc3-4c78-ad83-04853fab24e9','Select-Cat3','Football',0,'2024-07-29 14:08:10',0,NULL),('95436d5b-08f8-442b-b3b0-92767323fdd1','Shazible','General Clothes',4,'2024-07-29 13:36:57',0,NULL),('0fedf9ca-c837-482b-9c05-d222c368b3fa','Shezibre','Football',23,'2024-12-28 18:45:32',0,NULL),('8905cbf2-6c64-4010-83a5-4ebd6552eea5','Shin Guard','Football',68,'2024-07-29 12:55:30',0,NULL),('80cc738f-a082-4e08-a93d-b5437fb5e0c7','Shoes Brand New','General',78,'2024-07-29 13:17:11',0,NULL),('9427c62b-59d3-4de0-8df4-1e5da6173d07','Shoes_2nd','General',20,'2024-07-29 13:16:23',0,NULL),('ecad4c0e-dfa6-4ec0-b488-bb952b36821b','Short -OG','General Clothes',65,'2024-07-29 13:27:33',0,NULL),('0094c0b1-6be1-4c14-a5f7-df6199e8a072','Short -OG-Non','General Clothes',-1,'2024-07-29 13:28:18',0,NULL),('a34bc276-55de-4394-845c-0c0120e700f9','Short-Miami','Swimming',23,'2024-07-29 13:57:26',0,NULL),('3b57433b-fd21-4011-a377-ec5ec2fa0a40','Short-Normal','General Clothes',20,'2024-07-29 13:32:01',0,NULL),('cf0440b8-cad4-4557-8e4a-48b4e460c60d','Showe Cap','General',3,'2024-07-29 13:07:53',0,NULL),('dd9affd0-1cbb-4447-96cf-7fe88fc36136','Small Complete','Football',2,'2024-07-29 13:53:24',0,NULL),('68a49c17-b42d-48a2-af90-47c625e30cc9','Small Floaters','Swimming',7,'2024-07-29 12:53:18',0,NULL),('dda602a5-9cd2-4fb0-a2b2-01fa20cf45c2','Soap','Basic needs',2,'2025-04-02 20:18:00',0,NULL),('cf91eb7d-9cb5-4b35-9d94-e8588ce5ccb5','Soccer-Max Ball','Football',4,'2024-07-29 14:08:48',0,NULL),('fbe12bde-865d-4430-94ca-23b001dd8c24','Socks Fake','General',25,'2024-07-29 13:00:17',0,NULL),('79f46d71-9a88-44a8-a541-8aa636fd507a','Socks Normal','General',8,'2024-07-29 12:59:58',0,NULL),('435907da-04e8-4ebd-ac94-f13e10a6cd93','Socks_Football','Football',32,'2024-07-29 12:58:00',0,NULL),('aabd1045-523a-4b28-bbc0-21ce0a7d914e','Stop Watch','General',1,'2024-07-29 13:02:03',0,NULL),('482a2c95-9eaf-4123-9652-d1111db5a64d','Swimming 2pc','Swimming',30,'2024-07-29 13:58:06',0,NULL),('cac169c3-f610-4cb0-b54e-538171dcbfc4','Swimming Short ','Swimming',30,'2024-07-29 13:21:30',0,NULL),('c5beccfd-b6da-42c9-9250-1bab4ef18bb2','Swimming Short Small','Swimming',33,'2024-07-29 13:21:13',0,NULL),('1de1f827-c407-4cd9-8dd2-a8590fd7aa43','Swimming Suit Muslim','Swimming',17,'2024-07-29 13:19:13',0,NULL),('246da357-c6f9-4feb-912b-a9630e178d8c','Swimming Suit Small','Swimming',54,'2024-07-29 13:19:58',0,NULL),('371fa154-56ca-4e64-899c-f707d79565c7','Swimming Suit Women','Swimming',21,'2024-07-29 13:18:11',0,NULL),('20b37a85-a7bc-4a47-ba6d-73d0f6127fa4','Swimming Suit(Arena,..)','Swimming',125,'2024-07-29 13:18:49',0,NULL),('be1b9cb2-6d39-42e5-9a00-5a3c32fdbb0d','Swimming vest','Swimming',7,'2025-03-02 21:36:58',0,NULL),('6c9ee72f-b524-4368-925c-10f08670d630','T-shirt','General Clothes',58,'2024-07-29 13:31:18',0,NULL),('4683bd15-d9d9-49e1-aa98-08eabb924962','T-shirt Lacoste','General Clothes',48,'2024-07-29 13:43:17',0,NULL),('96976cc4-d51f-4945-bb56-fea9cb347eba','Tango Ball','Football',-1,'2024-07-29 14:04:15',0,NULL),('87ed7906-0c3d-4703-9076-188e3aa0bd7f','Trinning','General Clothes',30,'2024-07-29 13:48:36',0,NULL),('815c3ee0-7c19-4543-b8cb-095954a79563','Trophy Big','General',-2,'2024-07-29 12:51:54',0,NULL),('d7996d94-8788-44b1-abe8-f4c0b60ed357','Trophy Small','General',0,'2024-07-29 12:52:18',0,NULL),('683bbbfb-fbc1-47f6-b771-8e32d63d149f','Trousers Long','General Clothes',35,'2024-07-29 15:47:57',0,NULL),('f9046005-503b-4c3a-870d-9796f41081ef','Umbro','Football',0,'2024-07-29 14:06:13',0,NULL),('42d84676-4e18-42fb-a59a-bfb392dd5eba','Volleyball original ','Volleyball',2,'2025-04-13 19:16:11',0,NULL),('5a558adf-cfff-483c-8ba0-c7023cb674f6','VolleyNet','Volleyball',4,'2024-07-29 13:34:58',0,NULL),('fe035f49-7e5a-4731-9cf3-1fbdb298b038','Waist Support','General',3,'2024-07-29 12:54:26',0,NULL),('53bb2bea-2283-4415-884f-e3c4c0fdf286','Wilson','Basketball',1,'2024-07-29 14:00:54',0,NULL),('10d97926-1186-459b-ad03-87ca9cc4378f','World-Cup Ball','Football',3,'2024-07-29 14:04:37',0,NULL),('374b56eb-e737-4842-8325-e905e7617789','Wrist band','Tennis',9,'2025-04-30 18:12:00',0,NULL),('c149cd5e-edd2-42d7-b193-481007befae7','Yoga Mat','General Mechanics',1,'2024-07-29 13:34:32',0,NULL);
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `outgoing_stock`
--

DROP TABLE IF EXISTS `outgoing_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outgoing_stock` (
  `id` varchar(50) NOT NULL,
  `item_name` varchar(64) NOT NULL,
  `category_name` varchar(32) NOT NULL,
  `user_name` varchar(32) DEFAULT NULL,
  `branch_name` varchar(16) DEFAULT NULL,
  `quantity` int NOT NULL,
  `time_stamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_name` (`item_name`),
  KEY `category_name` (`category_name`),
  KEY `user_name` (`user_name`),
  KEY `fk_outgoing_stock_branch_name` (`branch_name`),
  CONSTRAINT `fk_outgoing_stock_branch_name` FOREIGN KEY (`branch_name`) REFERENCES `branch` (`branch_name`),
  CONSTRAINT `outgoing_stock_ibfk_1` FOREIGN KEY (`item_name`) REFERENCES `inventory` (`name`),
  CONSTRAINT `outgoing_stock_ibfk_2` FOREIGN KEY (`category_name`) REFERENCES `category` (`name`),
  CONSTRAINT `outgoing_stock_ibfk_3` FOREIGN KEY (`user_name`) REFERENCES `user` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `outgoing_stock`
--

LOCK TABLES `outgoing_stock` WRITE;
/*!40000 ALTER TABLE `outgoing_stock` DISABLE KEYS */;
INSERT INTO `outgoing_stock` VALUES ('00a437a3-41ad-425f-8b37-162b0afbcb1c','Nose clip','Swimming','Muvunyi_Jimmy','Town',1,'2024-12-05 12:46:40'),('029675e9-a0e1-4768-87ce-8ebfe776f736','Short -OG','General Clothes','Muvunyi_Jimmy','Town',1,'2025-06-05 14:59:50'),('0a46479e-2c84-4b04-9784-5863d6e50c9a','Kora ','General','Muvunyi_Jimmy','Csk',1,'2025-01-05 19:41:01'),('0bdc41f9-85cd-420d-ba7a-a3451100c332','Bag','Bag','Muvunyi_Jimmy','Town',21,'2025-04-02 19:56:08'),('0d314eaa-1596-40a3-a25c-37fe513f04da','Goalkeeper Gloves','Football','Muvunyi_Jimmy','Town',1,'2024-09-17 10:54:46'),('0f234488-bf78-4d26-bf3e-536bca2c0faf','Bag','Bag','Muvunyi_Jimmy','Town',16,'2025-06-05 15:02:14'),('10d1faec-fe22-4e21-ad57-f766d56dfb2a','Nose clip','Swimming','Muvunyi_Jimmy','Town',1,'2024-12-08 11:10:42'),('12b23daf-2cce-4e2c-b3f4-9454e075a1d9','Goalkeeper Gloves','Football','Muvunyi_Jimmy','Town',2,'2025-04-18 09:47:30'),('137f85c1-ff54-4a98-820d-c13375e30e2a','Rwanda(House Of Tayo)','Football','Muvunyi_Jimmy','Town',5,'2024-11-13 09:35:40'),('1785e0b4-578e-43d0-9831-c12ac34ab3e6','Bag','Bag','Muvunyi_Jimmy','Town',1,'2025-02-16 11:03:23'),('191f360d-799d-4224-bbde-583fa54f56d4','Yoga Mat','General Mechanics','Muvunyi_Jimmy','Town',2,'2025-06-05 15:02:34'),('1a42207d-8669-4c72-acbd-0f6e3ae5515a','Old-Season','Football','Muvunyi_Jimmy','Town',1,'2024-08-23 12:39:08'),('1adff5ec-6f69-4a12-a894-3908c1147ce9','Goggles Big','Swimming','Muvunyi_Jimmy','Town',1,'2024-10-09 12:11:26'),('1b092fe6-b4f6-489e-9946-574adc00514d','Trinning','General Clothes','Muvunyi_Jimmy','Town',2,'2025-02-16 11:04:00'),('2154fafa-fcaa-4bd5-b314-6b792f8a170b','Dunlop-All Court','Tennis','Muvunyi_Jimmy','Town',28,'2025-02-24 17:56:35'),('28241ebb-2e38-4240-bbb3-c06239007831','Rwanda(House Of Tayo)','Football','Muvunyi_Jimmy','Town',1,'2024-12-20 14:13:57'),('36afe43a-ff77-4533-87cc-63214cf66293','Basketball Jersey','Basketball','Muvunyi_Jimmy','Csk',1,'2025-07-07 12:22:23'),('39e600d6-9023-4a9c-a803-9c292024fb17','Short -OG','General Clothes','Muvunyi_Jimmy','Csk',1,'2025-06-05 15:06:23'),('3c421906-9ee5-4981-b2ed-ffdd1c40b0e6','Short -OG','General Clothes','Muvunyi_Jimmy','Town',2,'2025-07-30 18:07:12'),('41e05109-0744-4dad-b41d-e629b8118e2e','Football Boots','Football','Muvunyi_Jimmy','Town',1,'2025-01-20 18:24:41'),('4818890e-935b-46c6-8700-62b1840b11b2','Basketball original ','Basketball','Muvunyi_Jimmy','Town',1,'2025-07-18 21:15:52'),('483d5639-0061-43be-aec7-d0bb8faa6406','Football Boots','Football','Muvunyi_Jimmy','Csk',2,'2025-06-05 15:06:41'),('4a9331ed-a7c8-46d4-a696-cd27ae387da7','Leggings','General Clothes','Muvunyi_Jimmy','Town',11,'2024-08-23 12:38:23'),('4f04609c-69c3-4d9e-8c84-bcfb27c517d6','Molten original ','Football','Muvunyi_Jimmy','Town',1,'2025-06-08 11:30:03'),('4f316426-7624-4f1e-82c8-df3dbe92dd81','RayonSport Jersey','Football','Muvunyi_Jimmy','Town',7,'2025-04-30 18:14:53'),('510450d8-cb03-4fea-af48-0f7da0640417','Football Boots_2nd','Football','Muvunyi_Jimmy','Town',1,'2024-08-14 08:31:55'),('511eed5c-31bb-4b99-a291-a193a145b6ed','Medal','General','Muvunyi_Jimmy','Town',32,'2025-06-05 15:02:54'),('576035df-a539-4e47-96c5-13f319ced1a7','Bag','Bag','Muvunyi_Jimmy','Town',10,'2025-04-18 09:46:03'),('57d5f87c-933d-4e5c-b0e0-31abb363f024','Karate Belt','Karate','Muvunyi_Jimmy','Town',6,'2025-04-29 22:38:54'),('5de9ade0-a664-42c1-af4c-7eb8973ea8ba','Swimming Suit Small','Swimming','Muvunyi_Jimmy','Town',1,'2024-12-29 08:31:47'),('5ea42931-41ce-44d2-8d6f-77b9dab56d4a','Molten Basketball (7)','Basketball','Muvunyi_Jimmy','Eto_Gesi',1,'2024-08-04 12:02:20'),('61f7ebbf-f798-485a-b211-720cbc0bcec5','Arms Floater','Swimming','Muvunyi_Jimmy','Town',10,'2024-11-20 20:13:05'),('65521b66-e87e-40c8-ae0d-c011f8522cef','RayonSport Jersey','Football','Ashimwe_Geoffrey','Town',1,'2024-08-03 19:12:27'),('65e0e8dd-4d0d-4b3e-ba4e-f3a25f9fcc7f','New Season Jersey','Football','Muvunyi_Jimmy','Town',4,'2025-04-18 09:45:40'),('66621f00-9dc6-4d9b-b881-0ed25b5dd109','Football Boots','Football','Muvunyi_Jimmy','Town',1,'2025-06-05 15:01:47'),('688382b8-1840-473e-aa68-21fc6f03f923','Football Boots','Football','Muvunyi_Jimmy','Town',2,'2025-06-05 14:59:19'),('6e57fb22-335a-4353-af77-6c02bd788f60','Bag','Bag','Muvunyi_Jimmy','Town',1,'2025-03-27 19:22:17'),('6f7fe847-8791-4809-8138-7a00fc709b8d','Kimono','Karate','Muvunyi_Jimmy','Csk',19,'2025-04-13 19:25:13'),('746c18c8-a20f-49a4-a6ad-c89e6078d0cf','Rwanda(House Of Tayo)','Football','Muvunyi_Jimmy','Town',1,'2025-02-04 17:52:39'),('7982e4fa-0bbb-4759-8c1a-006397acfeb1','Fox 40','General','Muvunyi_Jimmy','Town',1,'2025-07-11 09:19:41'),('7c5bbe72-72cc-4734-a398-68e03b0f40fe','Soap','Basic needs','Muvunyi_Jimmy','Town',1,'2025-08-10 18:44:22'),('7d161044-486e-4e65-891f-fa5cd131a9db','Swimming Suit(Arena,..)','Swimming','Muvunyi_Jimmy','Town',4,'2025-04-18 09:45:06'),('8052b175-50af-4c35-8ca4-a7fcabd139c9','Short -OG','General Clothes','Muvunyi_Jimmy','Csk',1,'2025-01-05 19:39:36'),('806a0b34-0201-42ab-85cb-49529c746197','Bag','Bag','Muvunyi_Jimmy','Town',1,'2025-02-16 11:03:39'),('825234a4-19ec-4f1f-8acc-a0ae1b7e52f6','Bag','Bag','Muvunyi_Jimmy','Town',6,'2024-12-03 09:41:25'),('82de00ed-0c8a-49d2-adaa-0bbd102f58fc','T-shirt Lacoste','General Clothes','Muvunyi_Jimmy','Csk',1,'2024-11-03 19:07:49'),('8476fc2b-85e4-41cf-9837-f62696559740','Rwanda ','Football','Muvunyi_Jimmy','Town',3,'2024-08-14 08:32:32'),('852f6ff2-fd44-4bdc-8cc8-e16a077fbee2','Kimono','Karate','Muvunyi_Jimmy','Town',8,'2025-03-07 13:25:14'),('86db3f4b-2519-4885-9fe9-6028f55855a3','Goggles Big','Swimming','Muvunyi_Jimmy','Town',1,'2024-12-29 08:32:29'),('86f9c5ae-f06a-4801-ab88-86799573120e','Shoes_2nd','General','Muvunyi_Jimmy','Town',1,'2025-06-13 17:33:58'),('929b0e96-e5a4-4d34-a909-47edc5fc4e20','Bag','Bag','Muvunyi_Jimmy','Town',5,'2025-04-29 12:13:44'),('9758663e-8bb7-44d9-82fd-cb064cad4039','T-shirt','General Clothes','Muvunyi_Jimmy','Town',1,'2024-08-23 17:18:38'),('98680a64-d186-4a28-931c-6dd811911dfe','Swimming Short ','Swimming','Muvunyi_Jimmy','Town',1,'2024-11-26 08:24:14'),('9910240d-38ab-4b81-852a-54f33430a955','VolleyNet','Volleyball','Muvunyi_Jimmy','Town',1,'2025-07-11 09:19:28'),('995eaf24-dde3-4e27-be9d-e6d50a0e6a65','Kora Arms','General','Muvunyi_Jimmy','Town',1,'2024-08-23 17:18:22'),('998e1c26-d30c-4f6f-89de-9242e27694f2','Socks_Football','Football','Muvunyi_Jimmy','Town',2,'2025-07-05 16:55:09'),('999c9405-ec23-438a-b952-309eaaa6db80','T-shirt','General Clothes','Muvunyi_Jimmy','Csk',1,'2025-06-05 15:06:57'),('9ad96682-d77b-4688-964c-eeaa30a39c46','Short -OG','General Clothes','Muvunyi_Jimmy','Town',1,'2024-11-26 08:23:49'),('9b7d00c7-5b86-43cb-990e-2a2264deb6a8','Bag','Bag','Muvunyi_Jimmy','Town',1,'2025-06-05 15:03:15'),('9be484cb-acd2-4b8a-b0cc-837bc49ceef1','VolleyNet','Volleyball','Muvunyi_Jimmy','Town',1,'2024-11-05 16:25:36'),('9c878905-03fe-48ad-802c-65d7e752d2d5','Psg-Small','Football','Ashimwe_Geoffrey','Town',1,'2024-08-08 20:03:26'),('a73a8924-fa1c-486c-8144-774b63101c77','Medal','General','Muvunyi_Jimmy','Town',1,'2025-06-05 15:00:40'),('a9bccaf7-8828-4e54-b6d6-3daf795bcaec','Rwanda ','Football','Muvunyi_Jimmy','Town',1,'2025-03-26 09:45:46'),('ac1fb76a-657b-419c-9720-99063aa67190','Rwanda(House Of Tayo)','Football','Muvunyi_Jimmy','Town',1,'2025-06-05 15:00:08'),('aca36000-0e32-4262-ad4e-73db884ffe99','Fox 40','General','Muvunyi_Jimmy','Town',9,'2025-02-06 18:45:52'),('ad0c8a91-05b4-43f5-b0e6-eb8f228e4aa7','Goggles Medium','Swimming','Muvunyi_Jimmy','Town',1,'2025-01-19 10:11:46'),('ad254601-6302-4156-b5eb-e85bc689c130','Bag','Bag','Muvunyi_Jimmy','Town',80,'2024-09-12 09:19:53'),('ae657491-dfef-49fc-9d7a-bb1cd1cd915c','Volleyball original ','Volleyball','Muvunyi_Jimmy','Town',1,'2025-07-05 16:50:29'),('b286dd9c-da90-4dd6-aa34-9268c2f47847','Gym Gloves','General','Muvunyi_Jimmy','Town',9,'2025-04-18 09:46:31'),('b28a3d5f-f56b-4c9b-9b76-449f35d5ce0c','Real Madrid small','Football','Muvunyi_Jimmy','Town',1,'2024-12-24 17:48:12'),('b3e8eff9-e850-4cfb-ae0f-4595e8a511b5','Bag','Bag','Muvunyi_Jimmy','Town',6,'2025-06-05 15:01:06'),('b64e0d1c-7ff4-4525-9836-d45ba2e8fc00','Rwanda ','Football','Muvunyi_Jimmy','Town',2,'2025-07-08 12:59:19'),('b7c7461e-b943-40d7-8f16-8677de2b0787','T-shirt Lacoste','General Clothes','Muvunyi_Jimmy','Csk',1,'2025-01-05 19:40:44'),('b885fc4f-116e-4f5b-afc8-8f9a59db91cb','Rwanda ','Football','Muvunyi_Jimmy','Csk',1,'2025-07-07 12:22:55'),('ba8473b9-f3e6-4767-9adf-09f8b7e45148','Swimming Short ','Swimming','Muvunyi_Jimmy','Town',1,'2025-06-05 15:01:26'),('babc0a13-0ea9-4294-9188-d048c6edba24','Volleyball original ','Volleyball','Muvunyi_Jimmy','Town',1,'2025-06-08 11:30:17'),('bafb123e-80f2-4d26-a39f-9ada7c9c66b5','Kimono','Karate','Muvunyi_Jimmy','Town',6,'2025-04-18 09:44:30'),('bbecc491-d2ba-4430-8bec-433f7a25ee73','Molten Basketball (7)','Basketball','Muvunyi_Jimmy','Town',1,'2024-12-20 14:13:34'),('bdee5712-14b7-4be8-930c-b67fa8fcb607','Nose clip','Swimming','Muvunyi_Jimmy','Town',1,'2025-03-06 12:54:40'),('c0d381d6-a59d-47ec-8d8f-e1d9ee70a2f7','Molten original ','Football','Muvunyi_Jimmy','Csk',1,'2025-06-05 15:05:59'),('c16e5bcf-8dae-4a01-a4bd-03f7f5c4d968','Molten original ','Football','Muvunyi_Jimmy','Town',1,'2025-07-05 16:50:17'),('c44c088c-6abd-4c31-8755-e3ec7803bf4b','Old-Season','Football','Muvunyi_Jimmy','Town',7,'2024-08-30 13:55:48'),('cac4154b-29cb-43e7-ae76-27f1b17c19cd','Molten Basketball (7)','Basketball','Muvunyi_Jimmy','Town',1,'2025-07-24 18:27:10'),('cc78be7c-6afe-42e0-8d3c-6992bc2ac805','T-shirt','General Clothes','Muvunyi_Jimmy','Town',10,'2025-04-16 17:27:52'),('cc7e33ac-08df-4ac8-9a0c-a51b794df9ca','Rwanda(House Of Tayo)','Football','Muvunyi_Jimmy','Town',4,'2025-02-16 11:03:08'),('cfba7f58-0df2-4405-9eae-1797d442dcf1','Arms Floater','Swimming','Muvunyi_Jimmy','Town',5,'2025-06-26 16:22:44'),('d44aab3e-2f1e-43bd-89f1-6937c1979262','Cap','Swimming','Muvunyi_Jimmy','Town',1,'2025-01-19 10:11:25'),('d9164745-7579-46a0-acc5-0155d1834cb0','Bag','Bag','Muvunyi_Jimmy','Town',7,'2024-09-12 09:15:49'),('e21fa4c5-7e53-43bd-9c72-edbf4c36b1be','Goggles Small','Swimming','Muvunyi_Jimmy','Csk',1,'2024-09-15 11:25:12'),('e90649a2-d4f8-4d27-a1b6-d38aa592ec28','Goggles Big','Swimming','Muvunyi_Jimmy','Town',1,'2024-11-26 08:23:05'),('ef3c4c9a-3982-4c6e-bfdd-eaca5202e6af','T-shirt','General Clothes','Muvunyi_Jimmy','Town',1,'2024-09-20 09:51:01'),('fb988696-dccb-460e-ac08-ee15f24873c4','Swimming Short ','Swimming','Muvunyi_Jimmy','Town',1,'2025-06-13 15:29:20'),('fcacbad7-1446-4684-9cb9-fbc5169fb776','Bag','Bag','Muvunyi_Jimmy','Town',29,'2024-09-24 13:08:31');
/*!40000 ALTER TABLE `outgoing_stock` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `before_insert_outgoing_stock` BEFORE INSERT ON `outgoing_stock` FOR EACH ROW BEGIN
    IF NEW.category_name IS NULL THEN
        SET NEW.category_name = (
            SELECT category_name
            FROM inventory
            WHERE name = NEW.item_name
            LIMIT 1
        );
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_inventory_on_insert` AFTER INSERT ON `outgoing_stock` FOR EACH ROW BEGIN
    
    UPDATE inventory i
    SET i.inventory_quantity = i.inventory_quantity - NEW.quantity
    WHERE i.name = NEW.item_name;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `payment_method`
--

DROP TABLE IF EXISTS `payment_method`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_method` (
  `payment_id` varchar(50) DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `total_weekly` int NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_method`
--

LOCK TABLES `payment_method` WRITE;
/*!40000 ALTER TABLE `payment_method` DISABLE KEYS */;
INSERT INTO `payment_method` VALUES ('PM002','Card',30000),('PM003','Cash',28000),('PM001','Mobile Money',574000);
/*!40000 ALTER TABLE `payment_method` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `remark`
--

DROP TABLE IF EXISTS `remark`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `remark` (
  `id` varchar(50) NOT NULL,
  `time_stamp` datetime NOT NULL,
  `message` varchar(1000) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `remark`
--

LOCK TABLES `remark` WRITE;
/*!40000 ALTER TABLE `remark` DISABLE KEYS */;
INSERT INTO `remark` VALUES ('07575fb2-0bd4-485c-aa13-72618622a392','2024-12-28 18:17:46','Yvette Jersey Ya Man City 15,000'),('093caa32-e000-4f08-becf-6b117b3db3ec','2024-09-15 11:25:41','Ollla atwaye goggles small'),('23c41860-1e9b-49a6-b98e-0ca641746d24','2024-11-03 19:08:26','Lacoste1 outgoing Geoffrey '),('2f2479ae-5102-44f7-99ae-214abb90da33','2024-10-20 20:49:43','Played 1500 for TVA of 10k '),('31f1f90f-047f-4c4d-a4cf-1e7ad29c33a6','2024-07-29 16:31:20','pump-big 1 (20,000) -> csk_manangement '),('39fddd59-4d0f-4ade-8b12-69193304df3e','2024-09-29 20:09:24','17 aug 3 house of tayo entry error'),('3fd64cc9-f2b7-445e-affa-2c9038adaa21','2024-08-25 12:33:49','Bishyuye islam swimming suit 15000 asigayemo 10,000\r\nAsize ishati atwaye umupira gusa'),('59d0df62-8648-426d-b40c-79cafdf7fe7d','2024-07-30 16:00:49','reload test'),('62742694-d5ec-4eae-abc7-e5239f88130c','2025-04-24 20:00:04','Ibyacurujwe kuri 23/4 byinjijwe kuri 24/4'),('8438828c-235c-4e76-840e-f0549df1d1c6','2025-01-08 11:15:58','Error on Karate Belt There was Miss Match on initial  system:49 while actual number was 54 mean difference of (5)\r\nPs:Ashimwe Geoffrey'),('94cb13a9-98c4-4447-b769-0dc23dde90b6','2024-11-26 10:50:35','Yishyuye 5k yarasigayemo '),('9fb4a87c-d878-491f-b322-767c9548d584','2025-01-05 17:39:06','Umwana wa charles asigayemo 5000 kuri fins'),('a2bc45e1-6442-4557-8ebf-6e5d9a07f023','2024-08-23 20:33:37','Kola yamaboko\r\nT chirt tennis muzehe yabitanzemo gift'),('ac7d5bd0-aa2e-4d16-95dc-aa06a90a81bb','2024-08-26 09:58:40','Kazungu atwaye bag yishyuye 10,000 asigayemo 5000'),('b4662a0f-2d35-4b82-acf6-ba1c96f84184','2024-07-29 13:23:56','Start Stock Input'),('b6d30908-df84-4e0f-8394-9db61a28d148','2024-07-30 16:06:52','current status fixed\r\n'),('c02eefdd-8d1d-4018-beef-56f90a044a43','2024-12-14 18:43:11','Kazungu goggles medium 1'),('c45acfdd-cca8-4a86-86ea-c76aa4c08bc5','2024-11-28 17:33:57','Batwaye short OG yishyura 10k asigayemo 5k'),('c4d383b2-4950-4d23-8063-4abecb8242a5','2024-10-20 20:48:42','20 small corners replaced big trophy'),('c8f0560b-c656-430c-ae5c-12e0103db738','2024-12-14 18:43:51','Muzehe noseclip 1'),('cfa3d730-b9dd-48dd-a1e1-03a03e05086d','2025-01-08 11:31:42','Gustave:\r\n__________________\r\nShoes Brand New 2:60,000\r\nBag: 20,000\r\nLacoste: 15,000\r\nKola:10,000\r\nGym Gloves: 10,000\r\nIsuime:15,000\r\nWater Bottle: 5,000\r\nTotal:150,000'),('d2cb9b99-c845-4257-ac1c-45195a9e52c3','2025-06-02 22:52:47','Fixes Done'),('dece2ba6-29cf-4000-902d-b5443bc9d69c','2024-12-14 18:43:36','Protegenne bag 1'),('df3f332f-57bd-4412-8bcb-b471dbb5cd0c','2024-11-26 10:50:08','Goggles big yishyuye 10,000 asigayemo 5k'),('ea8e37ad-65eb-4309-84bf-8ac09bd86320','2024-09-06 10:23:16','Marginalised error : correct Dunlop +1 \r\nMore to : kimono\r\nDate 5/8\r\nError delete * from sale_weekly \r\n'),('ed7c1de7-cd56-4de3-9cf5-3c83edcad089','2025-01-19 13:42:04','Twongeyemo goggles medium yagarutse twari twahaye era'),('f84318bd-1451-4c3b-a0a2-c7e58428228c','2024-08-04 12:21:43','1-8-2024 : cap payment (momo:3000,cash:5000)');
/*!40000 ALTER TABLE `remark` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_weekly`
--

DROP TABLE IF EXISTS `sale_weekly`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_weekly` (
  `id` varchar(50) NOT NULL,
  `item_name` varchar(64) DEFAULT NULL,
  `category` varchar(32) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `price` int NOT NULL DEFAULT '0',
  `user_name` varchar(32) DEFAULT NULL,
  `time_stamp` datetime DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_name` (`user_name`),
  KEY `item_name` (`item_name`),
  KEY `fk_sale_weekly_category` (`category`),
  KEY `fk_sale_weekly_payment_method` (`payment_method`),
  CONSTRAINT `fk_sale_weekly_category` FOREIGN KEY (`category`) REFERENCES `inventory` (`category_name`),
  CONSTRAINT `fk_sale_weekly_payment_method` FOREIGN KEY (`payment_method`) REFERENCES `payment_method` (`name`),
  CONSTRAINT `sale_weekly_ibfk_1` FOREIGN KEY (`user_name`) REFERENCES `user` (`name`),
  CONSTRAINT `sale_weekly_ibfk_2` FOREIGN KEY (`item_name`) REFERENCES `inventory` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_weekly`
--

LOCK TABLES `sale_weekly` WRITE;
/*!40000 ALTER TABLE `sale_weekly` DISABLE KEYS */;
INSERT INTO `sale_weekly` VALUES ('00da4490-170f-4be4-a65c-51b803524406','Fox 40','General',1,5000,'Muvunyi_Jimmy','2025-08-13 18:31:09','Mobile Money'),('022bbae3-0fd5-4193-a039-c5de558c904b','Bag','Bag',1,20000,'Muvunyi_Jimmy','2025-08-11 20:49:37','Mobile Money'),('11fd5e30-14ba-4aa1-bc10-bf7855748e5b','Goggles Big','Swimming',2,40000,'Muvunyi_Jimmy','2025-08-11 20:48:02','Mobile Money'),('146d9534-a5c6-426e-9a34-1129d3704d45','New Season Jersey','Football',1,25000,'Muvunyi_Jimmy','2025-08-12 20:38:42','Mobile Money'),('1df1b602-4a66-4147-b1b5-fea792eaf7a6','Cap','Swimming',2,17000,'Muvunyi_Jimmy','2025-08-13 16:26:05','Mobile Money'),('20e0b464-acfe-47e8-8ee8-956f2338e5a8','Short -OG','General Clothes',1,15000,'Muvunyi_Jimmy','2025-08-12 20:39:39','Mobile Money'),('36311f57-690f-4dab-b443-4a384cff00fd','Goggles Big','Swimming',1,10000,'Muvunyi_Jimmy','2025-08-12 20:38:23','Cash'),('3be6d524-e2d3-4dcd-bca0-2e8e05a79a2c','Basketball Jersey','Basketball',1,18000,'Muvunyi_Jimmy','2025-08-11 20:47:17','Mobile Money'),('48aecae7-8535-498c-9522-49f127d7d932','Goggles Big','Swimming',1,18000,'Muvunyi_Jimmy','2025-08-12 20:37:42','Cash'),('4b336851-98c9-4810-8a97-39016f604df8','Goggles Big','Swimming',1,18000,'Muvunyi_Jimmy','2025-08-11 20:49:54','Mobile Money'),('4bcfece2-c14d-4004-a12a-15c3dcb42787','Football Boots','Football',1,38000,'Muvunyi_Jimmy','2025-08-13 18:31:48','Mobile Money'),('4c4e1aa2-76ee-4a9f-a46f-0cab568bae88','Goggles Medium','Swimming',1,10000,'Muvunyi_Jimmy','2025-08-11 20:48:22','Mobile Money'),('4e207fb5-71b1-4a9c-8683-2ad23be0773c','Cap','Swimming',1,10000,'Muvunyi_Jimmy','2025-08-13 18:30:54','Mobile Money'),('569feb5a-4d65-4f0e-94a8-24f303b8eba7','Swimming Suit Small','Swimming',1,20000,'Muvunyi_Jimmy','2025-08-11 20:50:43','Card'),('5a02bdc6-50d1-4240-bfd4-020abdd54ace','Bicycles','General Mechanics',1,75000,'Muvunyi_Jimmy','2025-08-12 20:36:44','Mobile Money'),('63e1333c-5445-4b09-8167-2087aca85997','Cap','Swimming',1,10000,'Muvunyi_Jimmy','2025-08-11 20:50:07','Mobile Money'),('75e530c4-785c-42a8-855e-b27ebb44d315','All-star Ball','Basketball',1,70000,'Muvunyi_Jimmy','2025-08-12 20:40:02','Mobile Money'),('87c5989f-e606-4e4b-a355-93737ed11c0f','Yoga Mat','General Mechanics',1,25000,'Muvunyi_Jimmy','2025-08-11 20:48:45','Mobile Money'),('92ed83d5-5390-4cab-8ce4-01d14dea46de','Goggles Medium','Swimming',1,10000,'Muvunyi_Jimmy','2025-08-11 20:51:25','Mobile Money'),('af6e7e23-ae08-4456-9391-68f4b1f37dbd','Cap','Swimming',1,8000,'Muvunyi_Jimmy','2025-08-11 20:48:58','Mobile Money'),('b10a5250-61dd-4ea0-8039-80d4498eee5b','Pins','Basic needs',1,1000,'Muvunyi_Jimmy','2025-08-13 18:31:25','Mobile Money'),('b8401df9-e3ac-477d-8d28-7ad9320ab946','Trousers Long','General Clothes',1,15000,'Muvunyi_Jimmy','2025-08-12 20:39:01','Mobile Money'),('be4fdbaa-cedc-4a79-8ff3-90ad520fe2d3','Pins','Basic needs',1,1000,'Muvunyi_Jimmy','2025-08-12 20:39:21','Mobile Money'),('d0c81beb-ba47-4f1b-adee-709b0ab195a2','Ring Floater','Swimming',1,10000,'Muvunyi_Jimmy','2025-08-11 20:51:04','Card'),('d4c9d771-6b2a-43c8-be73-3ff7dd9b9f43','Goggles Medium','Swimming',1,12000,'Muvunyi_Jimmy','2025-08-12 20:38:03','Mobile Money'),('d84929db-e3bb-4909-bcd7-6a54dc760bc1','Cap','Swimming',1,10000,'Muvunyi_Jimmy','2025-08-11 20:51:41','Mobile Money'),('d864207a-b33b-4e87-97ef-eae2d4f38882','Dunlop-All Court','Tennis',2,36000,'Muvunyi_Jimmy','2025-08-11 20:49:18','Mobile Money'),('e722542a-ac00-4cc3-8660-b63b6fb6e7b3','T-shirt','General Clothes',1,15000,'Muvunyi_Jimmy','2025-08-12 20:37:05','Mobile Money'),('fbf11bba-2e3b-4f86-a8f1-f03bf027b6a6','Racket','Tennis',2,70000,'Muvunyi_Jimmy','2025-08-11 20:47:39','Mobile Money');
/*!40000 ALTER TABLE `sale_weekly` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `set_category_from_inventory` BEFORE INSERT ON `sale_weekly` FOR EACH ROW BEGIN
    DECLARE category_name VARCHAR(32);
    
    SELECT i.category_name INTO category_name
    FROM inventory i
    WHERE i.name = NEW.item_name;
    
    IF category_name IS NOT NULL THEN
        SET NEW.category = category_name;
    ELSE
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Item not found in inventory table';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_category_percentage` AFTER INSERT ON `sale_weekly` FOR EACH ROW BEGIN
    DECLARE total_quantity INT;
    DECLARE category_quantity INT;

    
    SELECT SUM(quantity) INTO total_quantity
    FROM sale_weekly;

    
    SELECT SUM(quantity) INTO category_quantity
    FROM sale_weekly
    WHERE category = NEW.category;

    
    UPDATE category c
    SET c.percentage = CONCAT(ROUND((category_quantity * 100.0 / total_quantity), 2), '%')
    WHERE c.name = NEW.category;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_inventory_quantity` AFTER INSERT ON `sale_weekly` FOR EACH ROW BEGIN
    UPDATE inventory i
    SET i.inventory_quantity = i.inventory_quantity - NEW.quantity
    WHERE i.name = NEW.item_name;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_total_weekly_after_insert` AFTER INSERT ON `sale_weekly` FOR EACH ROW BEGIN
    
    UPDATE payment_method pm
    SET pm.total_weekly = (
        SELECT SUM(price)
        FROM sale_weekly
        WHERE payment_method = NEW.payment_method
    )
    WHERE pm.name = NEW.payment_method;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` varchar(50) NOT NULL,
  `name` varchar(32) NOT NULL,
  `password` varchar(256) DEFAULT NULL,
  `access_control` varchar(32) DEFAULT NULL,
  `email` varchar(32) NOT NULL,
  PRIMARY KEY (`name`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `password` (`password`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('dfcdbdcc-e992-40b6-8498-10469685f226','Ashimwe_Geoffrey','$2a$12$Ycl4oQyjkf6yQpdoqIv.gerfkURgXFnZclQg9GEfN/Tcg44Ka/7TC','Administrator','ashimwegeoffrey@gmail.com'),('081171ff-6c62-4125-a890-6c5ec26415e1','Muvunyi_Jimmy','$2a$12$TGB8a9ifw.JQxWYXQb8.QeNKfF62sVBJzOBf/wh/nMz3o9MRcN3Ae','Sale_Manager','muvunyijdieu1@gmail.com'),('468028f9-a123-4b50-a927-7769b3fc2d26','Sibomana_Eugene','yP+@*@`!$^PA6njm','Auditor','sibomanaeugene69@gmail.com');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-30 13:14:20
