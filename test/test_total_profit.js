var assert = require('assert');
functions = require('../script.js');
describe('total profit calculation', function () {
    it("finds out total profit", function () {
        assert.equal(functions._test.find_total_profit(data2), 211362)
    })
})


var data1 = `Session data: From 2020-04-20, 12:45:15 to 2020-04-20, 14:12:12 
Session: 01: 26h
Loot Type: Leader
Loot: 850, 248
Supplies: 638, 886
Balance: 211, 362
Maakhaix
Loot: 850, 248
Supplies: 189, 905
Balance: 660, 343
Damage: 2, 804, 232
Healing: 217, 541
Rep Arrogante(Leader)
Loot: 0
Supplies: 448, 981
Balance: -448, 981
Damage: 2, 470, 507
Healing: 1, 634, 227`

var data2 = `Session data: From 2020-04-07, 19:12:45 to 2020-04-07, 19:52:18
Session: 00:39h
Loot Type: Leader
Loot: 240,128
Supplies: 285,434
Balance: -45,306
Player1
    Loot: 240,128
    Supplies: 87,514
    Balance: 152,614
    Damage: 1,185,606
    Healing: 74,503
Player2
    Loot: 0
    Supplies: 197,920
    Balance: -197,920
    Damage: 1,063,010
    Healing: 663,872`

var data3 = `Session data: From 2020-04-07, 17:52:55 to 2020-04-07, 19:12:01
Session: 01:19h
Loot Type: Leader
Loot: 750,091
Supplies: 624,802
Balance: 125,289
Hashadamus
    Loot: 0
    Supplies: 175,735
    Balance: -175,735
    Damage: 1,965,567
    Healing: 135
Maakhaix
    Loot: 750,091
    Supplies: 159,815
    Balance: 590,276
    Damage: 2,391,664
    Healing: 130,233
Rep Arrogante (Leader)
    Loot: 0
    Supplies: 289,252
    Balance: -289,252
    Damage: 1,484,318
    Healing: 1,083,150`

var data4 = `Session data: From 2020-04-03, 05:08:21 to 2020-04-03, 07:32:46
Session: 02:24h
Loot Type: Leader
Loot: 2,376,789
Supplies: 1,094,728
Balance: 1,282,061
Maakhaix
    Loot: 2,376,789
    Supplies: 323,698
    Balance: 2,053,091
    Damage: 4,289,607
    Healing: 310,246
Rep Arrogante (Leader)
    Loot: 0
    Supplies: 771,030
    Balance: -771,030
    Damage: 3,970,535
    Healing: 2,482,573`

var data5 = `Session data: From 2020-03-31, 15:45:51 to 2020-03-31, 17:37:38
Session: 01:51h
Loot Type: Leader
Loot: 1,021,785
Supplies: 961,357
Balance: 60,428
Hashadamus
    Loot: 0
    Supplies: 276,096
    Balance: -276,096
    Damage: 2,647,969
    Healing: 356
Maakhaix
    Loot: 1,021,785
    Supplies: 243,805
    Balance: 777,980
    Damage: 2,838,803
    Healing: 251,822
Rep Arrogante (Leader)
    Loot: 0
    Supplies: 441,456
    Balance: -441,456
    Damage: 2,033,060
    Healing: 1,668,557`

var data6 = `Session data: From 2020-03-29, 19:20:47 to 2020-03-29, 20:15:50
Session: 00:55h
Loot Type: Leader
Loot: 403,523
Supplies: 413,998
Balance: -10,475
Maakhaix
    Loot: 403,523
    Supplies: 113,162
    Balance: 290,361
    Damage: 1,530,381
    Healing: 131,354
Rep Arrogante (Leader)
    Loot: 0
    Supplies: 300,836
    Balance: -300,836
    Damage: 1,386,013
    Healing: 910,013`

var data7 = `Session data: From 2020-03-28, 18:32:05 to 2020-03-28, 18:55:50
Session: 00:23h
Loot Type: Leader
Loot: 239,378
Supplies: 167,282
Balance: 72,096
Maakhaix
    Loot: 239,378
    Supplies: 53,796
    Balance: 185,582
    Damage: 672,313
    Healing: 56,412
Rep Arrogante (Leader)
    Loot: 0
    Supplies: 113,486
    Balance: -113,486
    Damage: 591,024
    Healing: 361,715`

var data8 = `Session data: From 2020-03-28, 16:27:17 to 2020-03-28, 18:31:48
Session: 02:04h
Loot Type: Leader
Loot: 990,503
Supplies: 920,432
Balance: 70,071
Player1
    Loot: 100
    Supplies: 244,312
    Balance: -244,212
    Damage: 2,380,911
    Healing: 710
Player2
    Loot: 990,403
    Supplies: 250,578
    Balance: 739,825
    Damage: 3,036,134
    Healing: 235,916
Player3
    Loot: 0
    Supplies: 425,542
    Balance: -425,542
    Damage: 2,005,992
    Healing: 1,676,043`

var data9 = `Session data: From 2020-03-25, 14:39:42 to 2020-03-25, 16:26:45
Session: 01:47h
Loot Type: Leader
Loot: 924,146
Supplies: 883,792
Balance: 40,354
Hashadamus
    Loot: 0
    Supplies: 256,001
    Balance: -256,001
    Damage: 2,036,797
    Healing: 508
Maakhaix
    Loot: 924,146
    Supplies: 206,570
    Balance: 717,576
    Damage: 2,489,928
    Healing: 187,496
Rep Arrogante (Leader)
    Loot: 0
    Supplies: 421,221
    Balance: -421,221
    Damage: 2,254,131
    Healing: 1,318,157`

var data10 = `Session data: From 2020-03-29, 17:26:08 to 2020-03-29, 19:03:17
Session: 01:37h
Loot Type: Leader
Loot: 686,979
Supplies: 643,187
Balance: 43,792
Hashadamus
    Loot: 500
    Supplies: 189,341
    Balance: -188,841
    Damage: 1,731,991
    Healing: 380
Maakhaix
    Loot: 686,479
    Supplies: 153,323
    Balance: 533,156
    Damage: 1,880,766
    Healing: 150,944
Rep Arrogante (Leader)
    Loot: 0
    Supplies: 300,523
    Balance: -300,523
    Damage: 1,292,118
    Healing: 1,052,702`

var data11 = `Session data: From 2020-03-20, 14:47:59 to 2020-03-20, 15:26:09
Session: 00:38h
Loot Type: Leader
Loot: 232,160
Supplies: 271,782
Balance: -39,622
Hashadamus
    Loot: 0
    Supplies: 208
    Balance: -208
    Damage: 5,421
    Healing: 0
Maakhaix (Leader)
    Loot: 232,160
    Supplies: 89,384
    Balance: 142,776
    Damage: 771,177
    Healing: 116,263
Rep Arrogante
    Loot: 0
    Supplies: 182,190
    Balance: -182,190
    Damage: 814,757
    Healing: 526,740`

var data12 = `Session data: From 2020-04-23, 19:23:13 to 2020-04-23, 19:31:13
Session: 00:08h
Loot Type: Market
Loot: 7,100
Supplies: 5,458
Balance: 1,642
A
	Loot: 1,021
	Supplies: 667
	Balance: 354
	Damage: 5,227
	Healing: 0
B
	Loot: 0
	Supplies: 4,144
	Balance: -4,144
	Damage: 15,268
	Healing: 3,337
C (Leader)
	Loot: 6,079
	Supplies: 647
	Balance: 5,432
	Damage: 13,415
	Healing: 1,455`

var data13 = `Session data: From 2020-04-23, 19:23:13 to 2020-04-23, 20:02:52
Session: 00:39h
Loot Type: Market
Loot: 177,119
Supplies: 116,996
Balance: 60,123
Aletharum
	Loot: 147,526
	Supplies: 35,765
	Balance: 111,761
	Damage: 215,515
	Healing: 837
Arwa Druid
	Loot: 16,657
	Supplies: 68,137
	Balance: -51,480
	Damage: 209,111
	Healing: 126,928
Kusnier Ironman (Leader)
	Loot: 12,936
	Supplies: 13,094
	Balance: -158
	Damage: 281,314
	Healing: 21,735`

var data14 = `Session data: From 2020-04-24, 10:41:34 to 2020-04-24, 11:20:35
Session: 00:39h
Loot Type: Market
Loot: 0
Supplies: 2,797
Balance: -2,797
King Eco (Leader)
	Loot: 0
	Supplies: 238
	Balance: -238
	Damage: 0
	Healing: 0
Kusnier Magician
	Loot: 0
	Supplies: 27
	Balance: -27
	Damage: 0
	Healing: 0
Takikolo
	Loot: 0
	Supplies: 147
	Balance: -147
	Damage: 0
	Healing: 0
Ten Sam Zeeq
	Loot: 0
	Supplies: 2,385
	Balance: -2,385
	Damage: 0
	Healing: 281`

var data15 = `Session data: From 2020-04-24, 11:32:25 to 2020-04-24, 11:34:49
Session: 00:02h
Loot Type: Market
Loot: 28,210
Supplies: 8,542
Balance: 19,668
King Eco
	Loot: 0
	Supplies: 1,728
	Balance: -1,728
	Damage: 22,465
	Healing: 20,223
Kusnier Magician
	Loot: 0
	Supplies: 3,864
	Balance: -3,864
	Damage: 41,828
	Healing: 0
Takikolo (Leader)
	Loot: 28,210
	Supplies: 1,150
	Balance: 27,060
	Damage: 15,268
	Healing: 1,516
Ten Sam Zeeq
	Loot: 0
	Supplies: 1,800
	Balance: -1,800
	Damage: 24,276
	Healing: 1,443`

var data16 = `Session data: From 2020-04-24, 11:32:25 to 2020-04-24, 12:16:14
Session: 00:43h
Loot Type: Market
Loot: 690,144
Supplies: 416,705
Balance: 273,439
King Eco
	Loot: 0
	Supplies: 119,039
	Balance: -119,039
	Damage: 692,819
	Healing: 678,117
Kusnier Magician
	Loot: 3,062
	Supplies: 103,448
	Balance: -100,386
	Damage: 1,134,882
	Healing: 0
Takikolo (Leader)
	Loot: 659,103
	Supplies: 119,806
	Balance: 539,297
	Damage: 417,221
	Healing: 35,290
Ten Sam Zeeq
	Loot: 27,979
	Supplies: 74,412
	Balance: -46,433
	Damage: 718,494
	Healing: 57,607`

var data17 = `Session data: From 2020-04-24, 11:32:25 to 2020-04-24, 11:34:49
Session: 00:02h
Loot Type: Market
Loot: 28,210
Supplies: 8,542
Balance: 519,570
Isudin
	Loot: 0
	Supplies: 1,728
	Balance: -325,358
	Damage: 22,465
	Healing: 20,223
Kusnier Magician
	Loot: 0
	Supplies: 3,864
	Balance: -723,876
	Damage: 41,828
	Healing: 0
Zeff Dragon
	Loot: 28,210
	Supplies: 1,150
	Balance: 1,000,928
	Damage: 15,268
	Healing: 1,516
Kusnier Ironman
	Loot: 0
	Supplies: 1,800
	Balance: 567,876
	Damage: 24,276
	Healing: 1,443`

var data18 = `Session data: From 2020-04-29, 19:11:31 to 2020-04-29, 19:48:06
Session: 00:36h
Loot Type: Market
Loot: 596,203
Supplies: 319,953
Balance: 276,250
Kusnier Magician
	Loot: 75,676
	Supplies: 70,881
	Balance: 4,795
	Damage: 998,221
	Healing: 40,973
Naron Sath (Leader)
	Loot: 504,255
	Supplies: 100,856
	Balance: 403,399
	Damage: 513,913
	Healing: 83,434
Olesska
	Loot: 464
	Supplies: 92,855
	Balance: -92,391
	Damage: 460,202
	Healing: 429,447
Shalverio
	Loot: 15,808
	Supplies: 55,361
	Balance: -39,553
	Damage: 591,904
	Healing: 42,102`

var data19 = `Session data: From 2020-04-30, 21:29:25 to 2020-04-30, 22:01:31
Session: 00:32h
Loot Type: Market
Loot: 459,320
Supplies: 269,089
Balance: 190,231
Devil Duba
	Loot: 380,937
	Supplies: 22,487
	Balance: 358,450
	Damage: 217,586
	Healing: 22,663
Kusnier Magician
	Loot: 43,115
	Supplies: 45,160
	Balance: -2,045
	Damage: 771,702
	Healing: 26,787
Naron Sath
	Loot: 4,395
	Supplies: 40,402
	Balance: -36,007
	Damage: 291,337
	Healing: 14,759
Tian Samus (Leader)
	Loot: 30,873
	Supplies: 161,040
	Balance: -130,167
	Damage: 738,116
	Healing: 442,474`

var data20 = `Session data: From 2020-04-30, 22:06:03 to 2020-04-30, 22:12:51
Session: 00:06h
Loot Type: Market
Loot: 101,527
Supplies: 49,330
Balance: 52,197
Devil Duba
	Loot: 4,019
	Supplies: 4,544
	Balance: -525
	Damage: 64,208
	Healing: 709
Kusnier Magician
	Loot: 500
	Supplies: 6,542
	Balance: -6,042
	Damage: 147,443
	Healing: 2,270
Tian Samus (Leader)
	Loot: 0
	Supplies: 30,954
	Balance: -30,954
	Damage: 134,507
	Healing: 95,647
Trampkizygica
	Loot: 97,008
	Supplies: 7,290
	Balance: 89,718
	Damage: 63,396
	Healing: 3,276`
