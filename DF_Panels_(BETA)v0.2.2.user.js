// ==UserScript==
// @name         DF Panels (BETA)
// @namespace    http://tampermonkey.net/
// @version      0.2.2
// @description  Panels script for Dead Frontier - Boss Timer, Auto Bank, Quick Service and Quick Buy
// @author       D1N0 + Community scripts
// @exclude      https://fairview.deadfrontier.com/onlinezombiemmo/index.php?action=login2
// @exclude      https://fairview.deadfrontier.com/onlinezombiemmo/index.php?action=logout*
// @match        https://fairview.deadfrontier.com/onlinezombiemmo/index.php*
// @match        https://fairview.deadfrontier.com/onlinezombiemmo/
// @match        https://fairview.deadfrontier.com/onlinezombiemmo/DF3D/DF3D_InventoryPage.php*
// @icon         https://www.favicon.cc/favicon/336/1014/favicon.ico
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @connect      dfprofiler.com
// @run-at       document-idle
// @license      GPL-3.0-or-later
// ==/UserScript==

/*
 * Created by D1N0 and inspired by community scripts
 * DFP: https://www.dfprofiler.com/profile/view/12191879
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DF PANELS - COMPREHENSIVE UTILITY PANELS FOR DEAD FRONTIER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * WHAT THIS SCRIPT DOES:
 * ----------------------
 * Adds four utility panels to the Dead Frontier game interface:
 * 
 * 1. BOSS TIMER
 *    - Countdown to next hourly boss spawn
 *    - Special Devil Hound spawn alert (Inner City special spawn only)
 *    - Boss map button (opens dfprofiler.com in modal)
 * 
 * 2. AUTO BANK
 *    - Quick withdraw buttons (50k, 150k, 5M, All)
 *    - Quick deposit all button
 *    - Restores marketplace search when returning from bank
 * 
 * 3. QUICK SERVICE
 *    - One-click food/medical/armor repair in marketplace
 *    - All Services button (executes all three)
 *    - Smart item selection based on character level
 *    - Money check before redirect to marketplace
 * 
 * 4. QUICK BUY
 *    - Rapid purchase of common items (food, ammo, repair kits)
 *    - Right-click to favorite items (green highlight)
 *    - Auto-search and purchase
 * 
 * DATA STORAGE:
 * -------------
 * - Marketplace cache: GM.getValue/GM.setValue (30s cache, max 17 requests/30s)
 * - Search history: localStorage (last search term)
 * - Favorites: localStorage (highlighted QuickBuy items)
 * 
 * EXTERNAL API:
 * ------------
 * - dfprofiler.com/bossmap/json - Boss spawn data (read-only, public)
 * - NO user data is sent externally
 * - All game actions use Dead Frontier's own endpoints
 * 
 * SECURITY:
 * ---------
 * - NO credentials stored
 * - Uses game's built-in hash() function for requests
 * - Isolated to panel container areas only
 * - Open source - full code visible below
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // Compatibility flag for other scripts
    window.BrowserImplant_QuickBuy = true;
    'use strict';

    window.BrowserImplant_QuickBuy = true;

    const origin = window.location.origin;
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const returnPage = params.get('originPage');
    const currentPage = params.get('page') || '';

    // Special pages where only the Boss Timer panel is shown
    const isDF3D = path.includes('DF3D_InventoryPage.php');
    const isBattlefield = !isDF3D && currentPage === '21';
    const isBossTimerOnly = isDF3D || isBattlefield;

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTOBANK: MARKETPLACE SEARCH RESTORATION
    // ═══════════════════════════════════════════════════════════════════════════
    // Restores the user's marketplace search query after returning from the bank.
    // This preserves workflow by remembering what they were searching for before banking. //
    ///////////////////////////////////////////

    if(sessionStorage.getItem('df_auto_restore')) {
        const last = localStorage.getItem('lastDFsearch');
        if(!last) {
            sessionStorage.removeItem('df_auto_restore');
        } else {
            const maxAttempts = 30;
            let attempts = 0;
            const tryRestore = () => {
                attempts++;
                const inp =
                    document.getElementById('searchField') ||
                    document.querySelector("input[name='searchField']") ||
                    document.querySelector('#marketSearch') ||
                    document.querySelector("input[type='text'][name='item_name']");
                const btn =
                    document.getElementById('makeSearch') ||
                    document.querySelector("#marketForm input[type='submit'], #marketForm input[type='button']");
                if(inp) {
                    inp.value = last;
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if(inp && btn) {
                    setTimeout(() => btn.click(), 80);
                    sessionStorage.removeItem('df_auto_restore');
                } else if(attempts < maxAttempts) {
                    setTimeout(tryRestore, 150);
                } else {
                    sessionStorage.removeItem('df_auto_restore');
                }
            };
            const startRestore = () => setTimeout(tryRestore, 100);
            if(document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', startRestore);
            } else {
                startRestore();
            }
        }
    }

    ///////////////////////////////////////////
    //  Autobank: Bank Page Handler          //
    ///////////////////////////////////////////

    if(currentPage === '15' && params.has('scripts')) {
        const action = params.get('scripts');
        window.addEventListener('load', () => {
            setTimeout(() => {
                if(action === 'withdraw') {
                    const amt = params.get('amount') || '50000';
                    const input = document.querySelector('#withdraw');
                    const btn = document.querySelector('#wBtn');
                    if(input && btn) {
                        input.value = amt;
                        input.setAttribute('value', amt);
                        ['input', 'change'].forEach(e => input.dispatchEvent(new Event(e, { bubbles: true })));
                        // eslint-disable-next-line no-undef
                        (typeof withdraw === 'function' ? withdraw() : btn.click());
                    }
                } else if(action === 'withdrawAll') {
                    // eslint-disable-next-line no-undef
                    if(typeof withdraw === 'function') withdraw(1);
                    else document.querySelector("button[onclick='withdraw(1);']")?.click();
                } else if(action === 'deposit') {
                    // eslint-disable-next-line no-undef
                    if(typeof deposit === 'function') deposit(1);
                    else document.querySelector("button[onclick='deposit(1);']")?.click();
                }
            }, 200);
            setTimeout(() => {
                sessionStorage.setItem('df_auto_restore', '1');
                const back = returnPage || '';
                window.location.replace(`${origin}${path}?page=${back}`);
            }, 500);
        });
        return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // QUICK SERVICE: GLOBAL VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    // Storage for marketplace data, user info, and rate limiting.
    // All data is cached locally - nothing is sent to external servers.              //
    ///////////////////////////////////////////

    function getUserVars() { return unsafeWindow.userVars; }
    function getGlobalData() { return unsafeWindow.globalData; }

    var itemsDataBank = {};
    var servicesDataBank = {};
    var userData = {};
    var savedMarketData = {
        requestsIssued: 0,
        previousDataTimestamp: 0,
        previousItemTimestamp: {},
        previousServicesTimestamp: 0,
        itemsDataBank: {},
        servicesDataBank: {}
    };
    var REQUEST_LIMIT = 17;
    var helpWindow = null;

    var pendingRequests = {
        requestsNeeded: 0,
        requestsCompleted: 0,
        requesting: false
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    // Helper functions for API requests, data manipulation, and UI feedback.
    // makeRequest() uses the game's built-in hash() function for security.              //
    ///////////////////////////////////////////

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function serializeObject(obj) {
        var pairs = [];
        for(let prop in obj) {
            if(!obj.hasOwnProperty(prop)) continue;
            pairs.push(prop + '=' + obj[prop]);
        }
        return pairs.join('&');
    }

    function makeRequest(requestUrl, requestParams, callbackFunc, callBackParams) {
        var userVars = getUserVars();
        requestParams.pagetime = userVars.pagetime;
        requestParams.templateID = "0";
        requestParams.sc = userVars.sc;
        requestParams.gv = 42;
        requestParams.userID = userVars.userID;
        requestParams.password = userVars.password;

        return new Promise((resolve) => {
            var xhttp = new XMLHttpRequest();
            var payload = null;
            xhttp.onreadystatechange = function() {
                if(this.readyState == 4 && this.status == 200) {
                    let callbackResponse = null;
                    if(callbackFunc != null) {
                        callbackResponse = callbackFunc(this.responseText, callBackParams);
                    }
                    if(callbackResponse == null) callbackResponse = true;
                    resolve(callbackResponse);
                }
            };
            payload = serializeObject(requestParams);
            xhttp.open("POST", requestUrl, true);
            xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhttp.setRequestHeader("x-requested-with", "SilverScriptRequest");
            payload = "hash=" + unsafeWindow.hash(payload) + "&" + payload;
            xhttp.send(payload);
        });
    }

    function cloneObject(object) { return JSON.parse(JSON.stringify(object)); }

    function isAtLocation(location) {
        if(location === "marketplace") return window.location.href.indexOf("page=35") !== -1;
        if(location === "home") {
            var url = window.location.href;
            return url === "https://fairview.deadfrontier.com/onlinezombiemmo/" ||
                   url === "https://fairview.deadfrontier.com/onlinezombiemmo/index.php" ||
                   !!url.match(/https:\/\/fairview\.deadfrontier\.com\/onlinezombiemmo\/index\.php(\?)?$/);
        }
        return false;
    }

    function findLastEmptyGenericSlot(slotType) {
        var userVars = getUserVars();
        for(let i = userVars["DFSTATS_df_" + slotType + "slots"]; i >= 1; i--) {
            if(userVars["DFSTATS_df_" + slotType + i + "_type"] === "") return i;
        }
        return false;
    }

    function addPendingRequest() {
        pendingRequests.requestsNeeded += 1;
        pendingRequests.requesting = true;
    }

    function completePendingRequest() {
        pendingRequests.requestsCompleted += 1;
        if(pendingRequests.requestsCompleted >= pendingRequests.requestsNeeded) {
            pendingRequests.requestsNeeded = 0;
            pendingRequests.requestsCompleted = 0;
            pendingRequests.requesting = false;
        }
    }

    function havePendingRequestsCompleted() { return !pendingRequests.requesting; }

    // Red warning box — used for insufficient funds
    function showMoneyWarning() {
        if(document.getElementById("qsMoneyWarning")) return;
        var overlay = document.createElement("div");
        overlay.id = "qsMoneyWarning";
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;justify-content:center;align-items:center;";

        var box = document.createElement("div");
        box.style.cssText = "background:#1a0000;border:3px solid #8b0000;border-radius:5px;padding:20px 40px;text-align:center;min-width:300px;box-shadow:0 0 20px rgba(139,0,0,0.5);";

        var title = document.createElement("div");
        title.textContent = "INSUFFICIENT FUNDS";
        title.style.cssText = "color:#ff0000;font-size:24px;font-weight:bold;font-family:Arial,sans-serif;margin-bottom:20px;text-shadow:2px 2px 4px rgba(0,0,0,0.8);";

        var sub = document.createElement("div");
        sub.textContent = "You don't have enough money for this action";
        sub.style.cssText = "color:#cccccc;font-size:14px;margin-bottom:20px;";

        var okBtn = document.createElement("button");
        okBtn.textContent = "OK";
        okBtn.style.cssText = "background:#8b0000;color:#fff;border:2px solid #ff0000;padding:10px 30px;font-size:16px;font-weight:bold;cursor:pointer;border-radius:3px;";
        okBtn.onclick = function() { document.body.removeChild(overlay); };

        box.appendChild(title);
        box.appendChild(sub);
        box.appendChild(okBtn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        if(unsafeWindow.playSound) unsafeWindow.playSound("error");
        setTimeout(function() {
            if(document.getElementById("qsMoneyWarning")) okBtn.click();
        }, 3000);
    }

    // Green warning box — used when a service is already at maximum
    function showAlreadyFullWarning(message) {
        if(document.getElementById("qsAlreadyFullWarning")) return;
        var overlay = document.createElement("div");
        overlay.id = "qsAlreadyFullWarning";
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;justify-content:center;align-items:center;";

        var box = document.createElement("div");
        box.style.cssText = "background:#001a05;border:3px solid #1a7a30;border-radius:5px;padding:20px 40px;text-align:center;min-width:300px;box-shadow:0 0 20px rgba(0,150,50,0.4);";

        var title = document.createElement("div");
        title.textContent = message;
        title.style.cssText = "color:#44ff88;font-size:20px;font-weight:bold;font-family:Arial,sans-serif;margin-bottom:20px;text-shadow:0 0 10px rgba(0,255,80,0.6),2px 2px 4px rgba(0,0,0,0.8);";

        var okBtn = document.createElement("button");
        okBtn.textContent = "OK";
        okBtn.style.cssText = "background:#0a5a1a;color:#fff;border:2px solid #44ff88;padding:10px 30px;font-size:16px;font-weight:bold;cursor:pointer;border-radius:3px;";
        okBtn.onclick = function() { document.body.removeChild(overlay); };

        box.appendChild(title);
        box.appendChild(okBtn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        setTimeout(function() {
            if(document.getElementById("qsAlreadyFullWarning")) okBtn.click();
        }, 3000);
    }

    function updateInventoryData(inventoryData) {
        unsafeWindow.updateIntoArr(unsafeWindow.flshToArr(inventoryData, "DFSTATS_"), unsafeWindow.userVars);
        unsafeWindow.populateInventory();
        unsafeWindow.populateCharacterInventory();
        unsafeWindow.updateAllFields();
    }

    function closeHelpWindowPage() {
        if(helpWindow) {
            helpWindow.parentNode.style.display = "none";
            helpWindow.innerHTML = "";
        }
        unsafeWindow.pageLock = false;
    }

    function showLoadingWindow() {
        if(helpWindow) {
            helpWindow.innerHTML = "<div style='text-align:center'>Loading, please wait...</div>";
            helpWindow.parentNode.style.display = "block";
        }
        unsafeWindow.pageLock = true;
    }

    ///////////////////////////////////////////
    //  QuickService: Init Data              //
    ///////////////////////////////////////////

    function initUserData() {
        var userVars = getUserVars();
        if(!userVars || !userVars.DFSTATS_df_tradezone) return;
        userData.tradezone = userVars.DFSTATS_df_tradezone;
    }

    function addItemToDatabank(flashType, quantity) {
        var globalData = getGlobalData();
        var item = {};
        item.id = flashType;
        item.extraInfo = "";
        item.flashType = flashType;
        item.trades = [];

        if(item.id && item.id !== "") {
            if(item.id.indexOf("_") !== -1) {
                item.extraInfo = capitalizeFirstLetter(item.id.split("_")[1]);
                item.id = item.id.split("_")[0];
            }
            var itemGlobData = globalData[item.id];
            item.name = itemGlobData.name;
            item.quantity = quantity < 1 ? 1 : quantity;

            if(itemGlobData.needcook == "1" && item.extraInfo !== "Cooked") {
                item.profession = "Chef";
                item.level = itemGlobData.level;
                item.professionLevel = item.level - 5;
            } else if(itemGlobData.needdoctor == "1") {
                item.profession = "Doctor";
                item.level = itemGlobData.level;
                item.professionLevel = item.level - 5;
            }
            if(item.extraInfo === "Cooked") {
                item.id = item.id + "_cooked";
                item.name = "Cooked " + item.name;
            }
            if(itemsDataBank[item.id] == null) itemsDataBank[item.id] = item;
        }
        return item;
    }

    async function loadSavedMarketData() {
        savedMarketData = JSON.parse(await GM.getValue("savedMarketData", JSON.stringify(savedMarketData)));
        if(savedMarketData.previousItemTimestamp == undefined) savedMarketData.previousItemTimestamp = {};
        itemsDataBank = savedMarketData.itemsDataBank;
        servicesDataBank = savedMarketData.servicesDataBank;
    }

    async function saveMarketData() {
        savedMarketData.itemsDataBank = itemsDataBank;
        savedMarketData.servicesDataBank = servicesDataBank;
        await GM.setValue("savedMarketData", JSON.stringify(savedMarketData));
    }

    ///////////////////////////////////////////
    //  QuickService: Market Requests        //
    ///////////////////////////////////////////

    function requestItem(dataBankItem) {
        if(Date.now() < savedMarketData.previousDataTimestamp + 30000) {
            if(savedMarketData.previousItemTimestamp[dataBankItem.id] != undefined &&
               Date.now() < savedMarketData.previousItemTimestamp[dataBankItem.id] + 30000 &&
               dataBankItem.rawServerResponse != undefined && dataBankItem.rawServerResponse !== "") {
                return true;
            }
            if(savedMarketData.requestsIssued < REQUEST_LIMIT) {
                savedMarketData.requestsIssued += 1;
            } else {
                return false;
            }
        } else {
            savedMarketData.previousDataTimestamp = Date.now();
            savedMarketData.requestsIssued = 0;
        }
        savedMarketData.previousItemTimestamp[dataBankItem.id] = Date.now();
        addPendingRequest();

        var reqParams = {};
        reqParams.tradezone = userData.tradezone;
        reqParams.searchname = encodeURI(dataBankItem.name.substring(0, 15));
        reqParams.category = '';
        reqParams.profession = '';
        reqParams.memID = '';
        reqParams.searchtype = "buyinglistitemname";
        reqParams.search = "trades";

        let cb = function(responseText) {
            dataBankItem.rawServerResponse = responseText;
            if(responseText !== "") {
                itemsDataBank[dataBankItem.id].trades = [];
                var maxTrades = [...responseText.matchAll(new RegExp("tradelist_[0-9]+_id_member=", "g"))].length;
                if(responseText.indexOf("tradelist_maxresults=0") === -1 && maxTrades > 0) {
                    var trade = {};
                    trade.tradeID = parseInt(responseText.match(new RegExp("tradelist_0_trade_id=[0-9]+&"))[0].split("=")[1].match(/[0-9]+/)[0]);
                    trade.price = parseInt(responseText.match(new RegExp("tradelist_0_price=[0-9]+&"))[0].split("=")[1].match(/[0-9]+/)[0]);
                    itemsDataBank[dataBankItem.id].trades.push(trade);
                }
            }
            completePendingRequest();
            return true;
        };
        return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/trade_search.php", reqParams, cb, null);
    }

    function buyItem(itemId) {
        if(itemsDataBank[itemId] == null || itemsDataBank[itemId].trades.length === 0) return false;
        var itemBuynum = itemsDataBank[itemId].trades[0].tradeID;
        var itemPrice = itemsDataBank[itemId].trades[0].price;
        if(itemBuynum == null) return false;

        var reqParams = {};
        reqParams.searchtype = "buyinglistitemname";
        reqParams.creditsnum = "undefined";
        reqParams.buynum = itemBuynum;
        reqParams.renameto = "undefined`undefined";
        reqParams.expected_itemprice = itemPrice;
        reqParams.expected_itemtype2 = "";
        reqParams.expected_itemtype = "";
        reqParams.itemnum2 = "0";
        reqParams.itemnum = "0";
        reqParams.price = "0";
        reqParams.action = "newbuy";

        let cb = function(responseText) {
            if(responseText.length < 32) {
                itemsDataBank[itemId].trades.shift();
                if(itemsDataBank[itemId].trades.length > 0) buyItem(itemId);
                else return false;
            } else {
                unsafeWindow.playSound("buysell");
                updateInventoryData(responseText);
            }
        };
        return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", reqParams, cb, null);
    }

    function refreshServicesDataBank() {
        if(!isAtLocation("marketplace")) return;
        if(Date.now() < savedMarketData.previousServicesTimestamp + 30000) return;
        savedMarketData.previousServicesTimestamp = Date.now();
        servicesDataBank = {
            Chef: {name: "Chef"},
            Doctor: {name: "Doctor"},
            Engineer: {name: "Engineer"}
        };
        for(let serviceName in servicesDataBank) {
            addPendingRequest();
            var svc = servicesDataBank[serviceName];
            var reqParams = {};
            reqParams.tradezone = userData.tradezone;
            reqParams.searchname = "";
            reqParams.category = "";
            reqParams.profession = encodeURI(svc.name.substring(0, 15));
            reqParams.memID = "";
            reqParams.searchtype = "buyinglist";
            reqParams.search = "services";

            let cb = (function(dataBankService) {
                return function(responseText) {
                    var responseLength = [...responseText.matchAll(new RegExp("tradelist_[0-9]+_id_member=", "g"))].length;
                    if(responseText !== "") {
                        for(let i = 0; i < responseLength; i++) {
                            let serviceLevel = parseInt(responseText.match(new RegExp("tradelist_" + i + "_level=[0-9]+&"))[0].split("=")[1].match(/[0-9]+/)[0]);
                            if(dataBankService[serviceLevel] === undefined) dataBankService[serviceLevel] = [];
                            let service = {};
                            service.userID = parseInt(responseText.match(new RegExp("tradelist_" + i + "_id_member=[0-9]+&"))[0].split("=")[1].match(/[0-9]+/)[0]);
                            service.price = parseInt(responseText.match(new RegExp("tradelist_" + i + "_price=[0-9]+&"))[0].split("=")[1].match(/[0-9]+/)[0]);
                            dataBankService[serviceLevel].push(service);
                        }
                    }
                    completePendingRequest();
                };
            })(svc);

            makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/trade_search.php", reqParams, cb, null);
        }
    }

    function buyService(slotNumber, profession, professionLevel) {
        if(servicesDataBank[profession] == null ||
           servicesDataBank[profession][professionLevel] === undefined ||
           servicesDataBank[profession][professionLevel].length === 0) return false;

        var serviceBuynum = servicesDataBank[profession][professionLevel][0].userID;
        var servicePrice = servicesDataBank[profession][professionLevel][0].price;
        var serviceAction = profession === "Engineer" ? "buyrepair" : profession === "Chef" ? "buycook" : "buyadminister";
        unsafeWindow.pageLock = true;

        var reqParams = {};
        reqParams.creditsnum = "0";
        reqParams.buynum = serviceBuynum;
        reqParams.renameto = "undefined`undefined";
        reqParams.expected_itemprice = servicePrice;
        reqParams.expected_itemtype2 = "";
        reqParams.expected_itemtype = "";
        reqParams.itemnum2 = "0";
        reqParams.itemnum = slotNumber;
        reqParams.price = "0";
        reqParams.action = serviceAction;

        let cb = function(responseText) {
            unsafeWindow.pageLock = false;
            if(responseText.length < 32) {
                servicesDataBank[profession][professionLevel].shift();
                if(servicesDataBank[profession][professionLevel].length > 0) buyService(slotNumber, profession, professionLevel);
                else refreshServicesDataBank();
            } else {
                var soundEffect = profession === "Engineer" ? "repair" : profession === "Chef" ? "cook" : "heal";
                unsafeWindow.playSound(soundEffect);
                updateInventoryData(responseText);
                return true;
            }
        };
        return makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", reqParams, cb, null);
    }

    ///////////////////////////////////////////
    //  QuickService: Level Lists            //
    ///////////////////////////////////////////

    function getLevelAppropriateMedicalTypeList() {
        var playerLevel = getUserVars().DFSTATS_df_level;
        if(playerLevel < 11) return ["steristrips", "plasters"];
        if(playerLevel < 21) return ["antisepticspray", "antibiotics"];
        if(playerLevel < 31) return ["bandages"];
        if(playerLevel < 41) return ["morphine"];
        if(playerLevel < 71) return ["nerotonin"];
        return ["nerotonin8b", "steroids"];
    }

    function getBestMedicalAndAdministerNeed() {
        var userVars = getUserVars();
        var globalData = getGlobalData();
        var damagePercentage = (userVars.DFSTATS_df_hpmax / userVars.DFSTATS_df_hpcurrent) * 100;
        var medList = getLevelAppropriateMedicalTypeList();
        var chosenMed = "";
        var needAdminister = true;

        for(let medType of medList) {
            let adminhealthrestore = parseInt(globalData[medType].healthrestore) * 3;
            if(chosenMed !== "") {
                if(adminhealthrestore >= damagePercentage) chosenMed = medType;
                else break;
            } else {
                chosenMed = medType;
            }
        }
        for(let medType of medList) {
            if(parseInt(globalData[medType].healthrestore) >= damagePercentage) {
                chosenMed = medType;
                needAdminister = false;
            } else {
                break;
            }
        }
        return [chosenMed, needAdminister];
    }

    function getLevelAppropriateFoodTypeList() {
        var playerLevel = getUserVars().DFSTATS_df_level;
        if(playerLevel < 11) return ["millet_cooked", "beer"];
        if(playerLevel < 21) return ["hotdogs_cooked", "bakedbeans_cooked"];
        if(playerLevel < 31) return ["potatoes_cooked", "tuna_cooked"];
        if(playerLevel < 41) return ["eggs_cooked", "salmon_cooked", "oats_cooked"];
        if(playerLevel < 71) return ["caviar_cooked", "mixednuts_cooked", "redwine"];
        return ["driedtruffles_cooked", "whiskey"];
    }

    function getBestFoodType() {
        var userVars = getUserVars();
        var globalData = getGlobalData();
        var hunger = 50 - parseInt(userVars.DFSTATS_df_hungerhp);
        var foodList = getLevelAppropriateFoodTypeList();
        var chosenFood = "";

        for(let foodType of foodList) {
            let parts = foodType.split("_");
            let foodItem = globalData[parts[0]];
            let actualFoodrestore = parts[1] !== undefined ? parseInt(foodItem.foodrestore) * 3 : parseInt(foodItem.foodrestore);
            if(chosenFood !== "") {
                if(actualFoodrestore >= hunger) chosenFood = foodType;
                else break;
            } else {
                chosenFood = foodType;
            }
        }
        return chosenFood;
    }

    ///////////////////////////////////////////
    //  QuickService: Actions               //
    ///////////////////////////////////////////

    // Redirects to marketplace if not already there, saving a pending action to resume on arrival
    async function qsGoToMarketplaceIfNeeded(type) {
        if(!isAtLocation("marketplace")) {
            localStorage.setItem("quickServicePending", JSON.stringify({ type, timestamp: Date.now() }));
            window.location.href = "https://fairview.deadfrontier.com/onlinezombiemmo/index.php?page=35";
            return false;
        }
        return true;
    }

    async function qsDoRepair(silent) {
        if(!havePendingRequestsCompleted()) return;
        if(!(await qsGoToMarketplaceIfNeeded("armor"))) return;

        var userVars = getUserVars();
        var globalData = getGlobalData();
        var armorType = userVars.DFSTATS_df_armourtype.split("_")[0];

        // Check if armor is already fully repaired
        if(armorType === '' || parseInt(userVars.DFSTATS_df_armourhp) >= parseInt(userVars.DFSTATS_df_armourhpmax)) {
            if(!silent) showAlreadyFullWarning("YOUR ARMOR IS ALREADY REPAIRED");
            return;
        }

        var repairLevel = parseInt(globalData[armorType].shop_level) - 5;
        if(!servicesDataBank.Engineer || !servicesDataBank.Engineer[repairLevel] || !servicesDataBank.Engineer[repairLevel][0]) return;
        if(servicesDataBank.Engineer[repairLevel][0].price > userVars.DFSTATS_df_cash) { showMoneyWarning(); return; }

        var slotNumber = findLastEmptyGenericSlot("inv");
        if(slotNumber === false) return;

        closeHelpWindowPage();
        showLoadingWindow();

        var chainParams = {};
        chainParams.unequip = {};
        chainParams.unequip.creditsnum = userVars.DFSTATS_df_credits;
        chainParams.unequip.buynum = "0";
        chainParams.unequip.renameto = "undefined`undefined";
        chainParams.unequip.expected_itemprice = "-1";
        chainParams.unequip.price = unsafeWindow.getUpgradePrice();
        chainParams.equip = cloneObject(chainParams.unequip);

        chainParams.unequip.expected_itemtype2 = userVars.DFSTATS_df_armourtype;
        chainParams.unequip.expected_itemtype = "";
        chainParams.unequip.itemnum2 = 34;
        chainParams.unequip.itemnum = slotNumber;
        chainParams.unequip.action = "newequip";

        chainParams.equip.expected_itemtype2 = "";
        chainParams.equip.expected_itemtype = userVars.DFSTATS_df_armourtype;
        chainParams.equip.itemnum2 = 34;
        chainParams.equip.itemnum = slotNumber;
        chainParams.equip.action = "newequip";

        await makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", chainParams.unequip, updateInventoryData, null);
        await buyService(slotNumber, "Engineer", repairLevel);
        await makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", chainParams.equip, updateInventoryData, null);
        closeHelpWindowPage();
    }

    async function qsDoMedical(silent) {
        if(!havePendingRequestsCompleted()) return;
        if(!(await qsGoToMarketplaceIfNeeded("medical"))) return;

        var userVars = getUserVars();
        // Compare against the character's actual hpmax
        if(parseInt(userVars.DFSTATS_df_hpcurrent) >= parseInt(userVars.DFSTATS_df_hpmax)) {
            if(!silent) showAlreadyFullWarning("YOU ARE ALREADY HEALTHY");
            return;
        }

        var result = getBestMedicalAndAdministerNeed();
        var itemId = result[0];
        var needsAdminister = result[1];

        if(!itemsDataBank[itemId]) addItemToDatabank(itemId, 1);
        var requestResult = await requestItem(itemsDataBank[itemId]);
        if(!requestResult) { alert("Rate limited. Try again in a minute."); return; }

        if(needsAdminister && (!servicesDataBank.Doctor || !servicesDataBank.Doctor[itemsDataBank[itemId].professionLevel] || !servicesDataBank.Doctor[itemsDataBank[itemId].professionLevel][0])) return;
        if(!itemsDataBank[itemId].trades || itemsDataBank[itemId].trades.length === 0) return;

        var itemPrice = itemsDataBank[itemId].trades[0].price;
        if(needsAdminister) itemPrice += servicesDataBank.Doctor[itemsDataBank[itemId].professionLevel][0].price;
        if(itemPrice > userVars.DFSTATS_df_cash) { showMoneyWarning(); return; }

        var slotNumber = findLastEmptyGenericSlot("inv");
        if(slotNumber === false) return;

        closeHelpWindowPage();
        showLoadingWindow();

        var buyResult = await buyItem(itemId);
        if(!buyResult) { closeHelpWindowPage(); return; }

        if(needsAdminister) {
            await buyService(slotNumber, "Doctor", itemsDataBank[itemId].professionLevel);
        } else {
            var medParams = {};
            medParams.creditsnum = "0";
            medParams.buynum = "0";
            medParams.renameto = "undefined`undefined";
            medParams.expected_itemprice = "-1";
            medParams.expected_itemtype2 = "";
            medParams.expected_itemtype = itemId;
            medParams.itemnum2 = "0";
            medParams.itemnum = slotNumber;
            medParams.price = "0";
            medParams.action = "newuse";
            await makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", medParams, updateInventoryData, null);
            unsafeWindow.playSound("heal");
        }
        closeHelpWindowPage();
    }

    async function qsDoFood(silent) {
        if(!havePendingRequestsCompleted()) return;
        if(!(await qsGoToMarketplaceIfNeeded("food"))) return;

        var userVars = getUserVars();
        // hungerhp 50 = full nourishment
        if(parseInt(userVars.DFSTATS_df_hungerhp) >= 50) {
            if(!silent) showAlreadyFullWarning("YOU ARE ALREADY NOURISHED");
            return;
        }

        var itemId = getBestFoodType();
        if(!itemsDataBank[itemId]) addItemToDatabank(itemId, 1);
        var requestResult = await requestItem(itemsDataBank[itemId]);
        if(!requestResult) { alert("Rate limited. Try again in a minute."); return; }
        if(!itemsDataBank[itemId].trades || itemsDataBank[itemId].trades.length === 0) return;

        if(itemsDataBank[itemId].trades[0].price > userVars.DFSTATS_df_cash) { showMoneyWarning(); return; }

        var slotNumber = findLastEmptyGenericSlot("inv");
        if(slotNumber === false) return;

        closeHelpWindowPage();
        showLoadingWindow();

        var buyResult = await buyItem(itemId);
        if(!buyResult) { closeHelpWindowPage(); return; }

        var foodParams = {};
        foodParams.creditsnum = "0";
        foodParams.buynum = "0";
        foodParams.renameto = "undefined`undefined";
        foodParams.expected_itemprice = "-1";
        foodParams.expected_itemtype2 = "";
        foodParams.expected_itemtype = itemId;
        foodParams.itemnum2 = "0";
        foodParams.itemnum = slotNumber;
        foodParams.price = "0";
        foodParams.action = "newconsume";
        await makeRequest("https://fairview.deadfrontier.com/onlinezombiemmo/inventory_new.php", foodParams, updateInventoryData, null);
        unsafeWindow.playSound("eat");
        closeHelpWindowPage();
    }

    // Runs all three services sequentially, skipping any that are already at maximum.
    // Shows a green warning if everything is already full.
    // Checks if user has enough cash BEFORE redirecting to marketplace.
    // Guards against userVars being unavailable (e.g. on the home page before the game loads).
    async function qsDoAll() {
        var userVars = getUserVars();

        // If userVars is available, check fullness and cash BEFORE doing anything
        if(userVars) {
            var armorType = userVars.DFSTATS_df_armourtype ? userVars.DFSTATS_df_armourtype.split("_")[0] : '';
            var foodFull = parseInt(userVars.DFSTATS_df_hungerhp) >= 50;
            var healthFull = parseInt(userVars.DFSTATS_df_hpcurrent) >= parseInt(userVars.DFSTATS_df_hpmax);
            var armorFull = armorType === '' || parseInt(userVars.DFSTATS_df_armourhp) >= parseInt(userVars.DFSTATS_df_armourhpmax);

            if(foodFull && healthFull && armorFull) {
                showAlreadyFullWarning("EVERYTHING IS ALREADY AT MAXIMUM");
                return;
            }

            // Check if user has any money at all — show warning immediately if broke
            var cash = parseInt(userVars.DFSTATS_df_cash);
            if(cash <= 0) {
                showMoneyWarning();
                return;
            }
        }

        // If not at marketplace, redirect there with pending 'all' action
        if(!isAtLocation("marketplace")) {
            localStorage.setItem("quickServicePending", JSON.stringify({ type: "all", timestamp: Date.now() }));
            window.location.href = "https://fairview.deadfrontier.com/onlinezombiemmo/index.php?page=35";
            return;
        }

        // At marketplace — run all services sequentially with silent=true to suppress individual warnings
        await qsDoFood(true);
        await qsDoMedical(true);
        await qsDoRepair(true);
    }

    function checkPendingAction() {
        if(!isAtLocation("marketplace")) return;
        var pendingData = localStorage.getItem("quickServicePending");
        if(!pendingData) return;
        try {
            var pending = JSON.parse(pendingData);
            if(Date.now() - pending.timestamp > 5000) { localStorage.removeItem("quickServicePending"); return; }
            localStorage.removeItem("quickServicePending");
            setTimeout(async function() {
                if(pending.type === "armor") await qsDoRepair(false);
                else if(pending.type === "medical") await qsDoMedical(false);
                else if(pending.type === "food") await qsDoFood(false);
                else if(pending.type === "all") await qsDoAll();
            }, 1000);
        } catch(e) {
            localStorage.removeItem("quickServicePending");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PANEL STYLING
    // ═══════════════════════════════════════════════════════════════════════════
    // All panel styles follow Dead Frontier's dark/orange theme.
    // Panels are designed to blend seamlessly with the game's existing UI.                                  //
    ///////////////////////////////////////////

    var css = `
        .df-panel {
            position: absolute;
            z-index: 10000;
            font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
        }

        .df-panel-inner {
            background: linear-gradient(180deg, #1a0a00 0%, #0d0500 40%, #120800 100%);
            border: 1px solid #5a1a00;
            box-shadow:
                0 4px 16px rgba(0,0,0,0.9),
                inset 0 1px 0 rgba(120,50,0,0.3),
                0 0 20px rgba(0,0,0,0.6);
        }

        .df-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 7px 10px 7px;
            background: #1a0800;
            cursor: default;
        }

        /* Divider line — real HTML element instead of CSS border (immune to sub-pixel zoom artifacts) */
        .df-panel-divider {
            height: 1px;
            background: #5a1a00;
            font-size: 0;
            line-height: 0;
        }

        .df-panel-title {
            color: #e87030;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 1px;
            text-shadow: 0 0 10px rgba(255,120,0,0.7), 1px 1px 2px rgba(0,0,0,0.9);
        }

        .df-panel-collapse {
            background: none;
            border: 1px solid #5a1a00;
            color: #b85a20;
            font-family: 'Arial Black', Arial, sans-serif;
            font-size: 9px;
            font-weight: 900;
            width: 18px;
            height: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            line-height: 1;
            text-shadow: 0 0 6px rgba(200,80,0,0.5);
            transition: all 0.12s ease;
        }

        .df-panel-collapse:hover {
            background: rgba(100,30,0,0.4);
            border-color: #aa4500;
            color: #e87030;
        }

        .df-panel-body {
            padding: 8px;
            background: linear-gradient(180deg, #1a0a00 0%, #0d0500 50%, #120800 100%);
        }

        .df-btn {
            background: linear-gradient(180deg, #2a0e00 0%, #1a0800 50%, #200b00 100%);
            border: 1px solid #4a1500;
            border-top-color: #6a2500;
            border-bottom-color: #300800;
            color: #b85a20;
            font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.5px;
            padding: 7px 8px;
            cursor: pointer;
            white-space: nowrap;
            text-shadow: 0 0 8px rgba(200,80,0,0.5), 1px 1px 2px rgba(0,0,0,0.9);
            box-shadow:
                inset 0 1px 0 rgba(150,60,0,0.2),
                inset 0 -1px 0 rgba(0,0,0,0.4),
                0 1px 3px rgba(0,0,0,0.6);
            transition: all 0.12s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }

        .df-btn::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 40%;
            background: linear-gradient(180deg, rgba(180,70,0,0.08), transparent);
            pointer-events: none;
        }

        .df-btn:hover {
            background: linear-gradient(180deg, #3d1500 0%, #2a0d00 50%, #320f00 100%);
            border-color: #8a3000;
            border-top-color: #aa4500;
            color: #e87030;
            text-shadow: 0 0 12px rgba(255,120,0,0.8), 1px 1px 2px rgba(0,0,0,0.9);
            box-shadow:
                inset 0 1px 0 rgba(200,80,0,0.3),
                inset 0 -1px 0 rgba(0,0,0,0.4),
                0 1px 6px rgba(150,50,0,0.4);
        }

        .df-separator {
            height: 1px;
            background: linear-gradient(90deg, transparent, #5a1a00, transparent);
            margin: 4px 0;
        }

        /* ==================== BOSS MAP MODAL ==================== */
        #bm-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            z-index: 999990;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: bm-fade-in 0.15s ease;
        }

        @keyframes bm-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        #bm-modal {
            position: relative;
            width: min(1100px, 96vw);
            height: min(780px, 90vh);
            background: linear-gradient(180deg, #1a0a00 0%, #0d0500 40%, #120800 100%);
            border: 2px solid #5a1a00;
            box-shadow:
                0 0 40px rgba(0,0,0,0.95),
                0 0 60px rgba(100,30,0,0.3),
                inset 0 1px 0 rgba(120,50,0,0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        #bm-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #1a0800;
            flex-shrink: 0;
        }

        #bm-modal-divider {
            height: 1px;
            background: #5a1a00;
            font-size: 0;
            line-height: 0;
            flex-shrink: 0;
        }

        #bm-modal-title {
            color: #e87030;
            font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 1.5px;
            text-shadow: 0 0 10px rgba(255,120,0,0.7), 1px 1px 2px rgba(0,0,0,0.9);
        }

        #bm-modal-close {
            background: none;
            border: 1px solid #5a1a00;
            color: #b85a20;
            font-family: 'Arial Black', Arial, sans-serif;
            font-size: 12px;
            font-weight: 900;
            width: 22px;
            height: 22px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            line-height: 1;
            transition: all 0.12s ease;
        }

        #bm-modal-close:hover {
            background: rgba(150,30,0,0.5);
            border-color: #aa4500;
            color: #ff6020;
        }

        #bm-modal-iframe {
            flex: 1;
            width: 100%;
            border: none;
            display: block;
            background: #0d0500;
        }

        /* ==================== BOSS TIMER ==================== */
        #bt-body {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        /* Wrapper for the two buttons (Boss Map + Timer) */
        #bt-buttons {
            display: flex;
            align-items: stretch;
            gap: 6px;
        }

        #bt-boss-btn {
            flex: 1;
            color: #af9b6d;
            text-shadow: 0 0 8px rgba(175,155,109,0.5), 1px 1px 2px rgba(0,0,0,0.9);
        }

        #bt-timer {
            flex: 1;
            font-size: 11px;
            letter-spacing: 2px;
            min-width: 58px;
        }

        /* Devil Hound alert banner — appears below the buttons */
        #bt-devil-banner {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 0 0 0;
            background: transparent;
            animation: bt-banner-in 0.3s ease;
        }

        @keyframes bt-banner-in {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        #bt-devil-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #e87030;
            flex-shrink: 0;
            animation: bt-dot-blink 1.4s ease-in-out infinite;
        }

        @keyframes bt-dot-blink {
            0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(232,112,48,0.8); }
            50%       { opacity: 0.3; box-shadow: none; }
        }

        /* Pulsing glow on the Devil Hound text when active */
        #bt-devil-text {
            color: #e87030;
            font-family: 'Arial Black', 'Arial Bold', Arial, sans-serif;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.8px;
            text-shadow: 0 0 6px rgba(255,120,0,0.5), 1px 1px 2px rgba(0,0,0,0.9);
            animation: bt-devil-text-pulse 1.4s ease-in-out infinite;
        }

        @keyframes bt-devil-text-pulse {
            0%, 100% { text-shadow: 0 0 6px rgba(255,120,0,0.5), 1px 1px 2px rgba(0,0,0,0.9); }
            50%       { text-shadow: 0 0 12px rgba(255,120,0,0.85), 1px 1px 2px rgba(0,0,0,0.9); }
        }

        #bt-timer.bt-urgent {
            color: #cc3030;
            border-color: #6a1515;
            border-top-color: #8a2020;
            text-shadow: 0 0 12px rgba(255,50,50,0.8), 1px 1px 2px rgba(0,0,0,0.9);
            animation: bt-pulse 1s ease-in-out infinite;
        }

        @keyframes bt-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* ==================== AUTOBANK ==================== */
        #ab-buttons {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        #ab-buttons .df-btn { width: 100%; }

        .df-btn.df-btn-deposit {
            color: #8a1a1a;
            border-color: #3a0a0a;
            border-top-color: #5a1515;
        }

        .df-btn.df-btn-deposit:hover {
            background: linear-gradient(180deg, #2a0a0a 0%, #1a0606 50%, #200808 100%);
            border-color: #6a1515;
            border-top-color: #8a2020;
            color: #cc3030;
            text-shadow: 0 0 12px rgba(255,50,50,0.7), 1px 1px 2px rgba(0,0,0,0.9);
        }

        /* ==================== QUICK SERVICE ==================== */
        #qs-buttons {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        #qs-buttons .df-btn { width: 100%; }

        /* 3-column grid for the three service buttons */
        #qs-service-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
        }

        #qs-service-grid .df-btn { width: 100%; }

        .df-btn.df-btn-all-services {
            color: #8a1a1a;
            border-color: #3a0a0a;
            border-top-color: #5a1515;
            width: 100%;
        }

        .df-btn.df-btn-all-services:hover {
            background: linear-gradient(180deg, #2a0a0a 0%, #1a0606 50%, #200808 100%);
            border-color: #6a1515;
            border-top-color: #8a2020;
            color: #cc3030;
            text-shadow: 0 0 12px rgba(255,50,50,0.7), 1px 1px 2px rgba(0,0,0,0.9);
        }

        /* ==================== QUICKBUY ==================== */
        #qb-body .df-btn {
            font-size: 8px;
            letter-spacing: 0.3px;
            width: 100%;
        }

        .qb-section-title {
            color: #e87030;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1px;
            text-shadow: 0 0 8px rgba(200,80,0,0.4);
            margin: 4px 0 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #3a1000;
        }

        .qb-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
            margin-bottom: 4px;
        }

        .df-btn.qb-highlighted {
            background: linear-gradient(180deg, #0a2a00 0%, #051800 50%, #081e00 100%);
            border-color: #2a5a00;
            border-top-color: #3a7a00;
            color: #60cc20;
            text-shadow: 0 0 8px rgba(80,200,0,0.5), 1px 1px 2px rgba(0,0,0,0.9);
        }

        .df-btn.qb-highlighted:hover {
            background: linear-gradient(180deg, #0f3a00 0%, #082200 50%, #0c2800 100%);
            border-color: #3a7a00;
            color: #80ee40;
            text-shadow: 0 0 12px rgba(100,255,0,0.7), 1px 1px 2px rgba(0,0,0,0.9);
        }
    `;

    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    ///////////////////////////////////////////
    //  Panel Helpers                        //
    ///////////////////////////////////////////

    function makePanel(id) {
        var panel = document.createElement('div');
        panel.id = id + '-panel';
        panel.className = 'df-panel';
        var inner = document.createElement('div');
        inner.className = 'df-panel-inner';
        panel.appendChild(inner);
        return { panel, inner };
    }

    function makeHeader(inner, titleText, collapseKey, bodyEl) {
        var header = document.createElement('div');
        header.className = 'df-panel-header';

        var title = document.createElement('span');
        title.className = 'df-panel-title';
        title.textContent = titleText;

        var btn = document.createElement('button');
        btn.className = 'df-panel-collapse';
        btn.textContent = '–';

        header.appendChild(title);
        header.appendChild(btn);
        inner.appendChild(header);

        // Divider line — real HTML element, not a CSS border (immune to sub-pixel zoom artifacts)
        var divider = document.createElement('div');
        divider.className = 'df-panel-divider';
        inner.appendChild(divider);

        var isCollapsed = localStorage.getItem(collapseKey) === 'true';
        if(isCollapsed) {
            bodyEl.style.display = 'none';
            divider.style.display = 'none';
            btn.textContent = '+';
        }

        btn.addEventListener('click', function() {
            isCollapsed = !isCollapsed;
            bodyEl.style.display = isCollapsed ? 'none' : '';
            divider.style.display = isCollapsed ? 'none' : '';
            btn.textContent = isCollapsed ? '+' : '–';
            localStorage.setItem(collapseKey, isCollapsed ? 'true' : 'false');
        });
    }

    function makeButton(label, extraClass) {
        var btn = document.createElement('button');
        btn.className = 'df-btn' + (extraClass ? ' ' + extraClass : '');
        btn.textContent = label;
        return btn;
    }

    function makeSeparator() {
        var sep = document.createElement('div');
        sep.className = 'df-separator';
        return sep;
    }

    ///////////////////////////////////////////
    //  Boss Timer Panel                     //
    ///////////////////////////////////////////

    function openBossMapModal() {
        if(document.getElementById('bm-overlay')) return;

        var overlay = document.createElement('div');
        overlay.id = 'bm-overlay';

        var modal = document.createElement('div');
        modal.id = 'bm-modal';

        var header = document.createElement('div');
        header.id = 'bm-modal-header';

        var titleEl = document.createElement('span');
        titleEl.id = 'bm-modal-title';
        titleEl.textContent = 'BOSS MAP';

        var closeBtn = document.createElement('button');
        closeBtn.id = 'bm-modal-close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(overlay);
        });

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        var divider = document.createElement('div');
        divider.id = 'bm-modal-divider';

        var iframe = document.createElement('iframe');
        iframe.id = 'bm-modal-iframe';
        iframe.src = 'https://www.dfprofiler.com/bossmap';
        iframe.setAttribute('allowfullscreen', '');

        modal.appendChild(header);
        modal.appendChild(divider);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close when clicking the dark overlay outside the modal
        overlay.addEventListener('click', function(e) {
            if(e.target === overlay) document.body.removeChild(overlay);
        });

        // Close with ESC key
        function onKeyDown(e) {
            if(e.key === 'Escape') {
                if(document.getElementById('bm-overlay')) document.body.removeChild(overlay);
                document.removeEventListener('keydown', onKeyDown);
            }
        }
        document.addEventListener('keydown', onKeyDown);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEVIL HOUND SPECIAL SPAWN TRACKER
    // ═══════════════════════════════════════════════════════════════════════════
    // Polls dfprofiler.com/bossmap/json every 2 minutes to detect special Devil Hound spawns.
    // Only detects the INNER CITY special spawn (boss_num < 10), not regular Wasteland spawns.
    // Shows alert banner below Boss Timer when detected.                  //
    ///////////////////////////////////////////

    // Calls the dfprofiler bossmap JSON endpoint and checks if Devil Hound is active.
    //
    // JSON shape: object with numeric string keys ("0", "1", ...) plus "bosshash" and "servertime".
    // Each entry has a "special_enemy_type" field like "1 x Devil Hound" or "2 x Flaming Titan".
    // Ghost hounds are entries where "reward_cash" and "reward_exp" are both "0",
    // "event_type" is "" and the entry has no dfp_objectives — same as regular boss slots.
    // The dfprofiler site distinguishes ghosts via isoa/location being off-map, which we
    // cannot easily check — but since the user only wants to know if a real DH is up,
    // detecting ANY "Devil Hound" in special_enemy_type is sufficient (ghost or not, it's still up).
    // Returns a Promise<bool>: true if at least one Devil Hound entry exists, false otherwise.
    function checkDevilHound() {
        return new Promise(function(resolve) {
            GM.xmlHttpRequest({
                method: 'GET',
                url: 'https://www.dfprofiler.com/bossmap/json/?_=' + Date.now(),
                headers: {
                    'Accept': 'application/json, text/javascript, */*',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                onload: function(response) {
                    try {
                        var data = JSON.parse(response.responseText);
                        var found = false;

                        // Iterate over numeric-keyed entries — skip meta keys like "bosshash" / "servertime"
                        for(var key in data) {
                            if(!data.hasOwnProperty(key)) continue;
                            if(isNaN(parseInt(key))) continue; // skip non-numeric keys
                            var entry = data[key];
                            var enemyType = (entry.special_enemy_type || '').toLowerCase();
                            var bossNum = parseInt(entry.boss_num || '999');
                            
                            // Only detect the SPECIAL daily Devil Hound spawn (Inner City, near Secronom).
                            // The special spawn has a low boss_num (1-6 range), while the regular Wasteland
                            // Devil Hound spawns have boss_num 27+. Filter to boss_num < 10 to catch only special.
                            if(enemyType.includes('devil hound') && bossNum < 10) {
                                found = true;
                                break;
                            }
                        }
                        resolve(found);
                    } catch(e) {
                        resolve(false);
                    }
                },
                onerror: function() { resolve(false); }
            });
        });
    }

        // Starts polling dfprofiler every 2 minutes to track Devil Hound status.
    // Updates the banner and button pulse state accordingly.
    function startDevilHoundTracker(bossBtn, btInner) {
        var bannerEl = null;

        function setBannerVisible(visible) {
            if(visible && !bannerEl) {
                // Create the banner and insert it INSIDE bt-body, after the buttons
                bannerEl = document.createElement('div');
                bannerEl.id = 'bt-devil-banner';

                var dot = document.createElement('div');
                dot.id = 'bt-devil-dot';

                var text = document.createElement('span');
                text.id = 'bt-devil-text';
                text.textContent = 'DEVIL HOUND HAS SPAWNED';

                bannerEl.appendChild(dot);
                bannerEl.appendChild(text);

                // Insert banner as the last child of bt-body (after boss map button and timer)
                var btBody = document.getElementById('bt-body');
                if(btBody) {
                    btBody.appendChild(bannerEl);
                }

            } else if(!visible && bannerEl) {
                bannerEl.remove();
                bannerEl = null;
            }
        }

        async function poll() {
            var active = await checkDevilHound();
            setBannerVisible(active);
        }

        // First check immediately, then every 2 minutes
        poll();
        setInterval(poll, 2 * 60 * 1000);
    }

    function getSecondsUntilNextHour() {
        var now = new Date();
        return (59 - now.getMinutes()) * 60 + (59 - now.getSeconds());
    }

    function formatTime(totalSeconds) {
        var m = Math.floor(totalSeconds / 60);
        var s = totalSeconds % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function buildBossPanel(skipTracker) {
        var body = document.createElement('div');
        body.id = 'bt-body';
        body.className = 'df-panel-body';

        var built = makePanel('bt');
        makeHeader(built.inner, 'BOSS TIMER', 'btCollapsed', body);
        built.inner.appendChild(body);

        // Create wrapper for the two buttons
        var buttonsWrapper = document.createElement('div');
        buttonsWrapper.id = 'bt-buttons';

        var bossBtn = makeButton('BOSS MAP', '');
        bossBtn.id = 'bt-boss-btn';
        bossBtn.addEventListener('click', function() { openBossMapModal(); });

        var timerEl = document.createElement('div');
        timerEl.id = 'bt-timer';
        timerEl.className = 'df-btn';
        timerEl.textContent = formatTime(getSecondsUntilNextHour());

        buttonsWrapper.appendChild(bossBtn);
        buttonsWrapper.appendChild(timerEl);
        body.appendChild(buttonsWrapper);

        setInterval(function() {
            var remaining = getSecondsUntilNextHour();
            timerEl.textContent = formatTime(remaining);
            if(remaining <= 300) timerEl.classList.add('bt-urgent');
            else timerEl.classList.remove('bt-urgent');
        }, 1000);

        // Start Devil Hound tracker only on normal pages (not DF3D/battlefield)
        if(!skipTracker) {
            startDevilHoundTracker(bossBtn, built.inner);
        }

        return built.panel;
    }

    ///////////////////////////////////////////
    //  Autobank Panel                       //
    ///////////////////////////////////////////

    function buildAutobankPanel() {
        var buttonsDiv = document.createElement('div');
        buttonsDiv.id = 'ab-buttons';

        var body = document.createElement('div');
        body.className = 'df-panel-body';
        body.appendChild(buttonsDiv);

        var built = makePanel('ab');
        makeHeader(built.inner, 'AUTO BANK', 'ab2Collapsed', body);
        built.inner.appendChild(body);

        var buttonDefs = [
            { label: 'WITHDRAW 50K', action: 'withdraw', amount: '50000', deposit: false },
            { label: 'WITHDRAW 150K', action: 'withdraw', amount: '150000', deposit: false },
            { label: 'WITHDRAW 5M', action: 'withdraw', amount: '5000000', deposit: false },
            { label: 'WITHDRAW ALL', action: 'withdrawAll', amount: null, deposit: false },
            { separator: true },
            { label: 'DEPOSIT ALL', action: 'deposit', amount: null, deposit: true },
        ];

        buttonDefs.forEach(function(def) {
            if(def.separator) { buttonsDiv.appendChild(makeSeparator()); return; }
            var btn = makeButton(def.label, def.deposit ? 'df-btn-deposit' : '');
            btn.addEventListener('click', function() {
                var si = document.getElementById('searchField') ||
                    document.querySelector("input[name='searchField']") ||
                    document.querySelector("input[type='text'][name='item_name']");
                if(si) localStorage.setItem('lastDFsearch', si.value);
                var url = `${origin}${path}?page=15&scripts=${def.action}`;
                if(def.amount) url += `&amount=${def.amount}`;
                if(currentPage) url += `&originPage=${currentPage}`;
                window.location.replace(url);
            });
            buttonsDiv.appendChild(btn);
        });

        return built.panel;
    }

    ///////////////////////////////////////////
    //  Quick Service Panel                  //
    ///////////////////////////////////////////

    function buildQuickServicePanel() {
        var buttonsDiv = document.createElement('div');
        buttonsDiv.id = 'qs-buttons';

        var body = document.createElement('div');
        body.className = 'df-panel-body';
        body.appendChild(buttonsDiv);

        var built = makePanel('qs');
        makeHeader(built.inner, 'QUICK SERVICE', 'qsCollapsed', body);
        built.inner.appendChild(body);

        var cookBtn = makeButton('COOKING', '');
        cookBtn.addEventListener('click', function() { qsDoFood(false); });

        var medBtn = makeButton('MEDICAL', '');
        medBtn.addEventListener('click', function() { qsDoMedical(false); });

        var repairBtn = makeButton('REPAIR', '');
        repairBtn.addEventListener('click', function() { qsDoRepair(false); });

        // 3-column grid for the three service buttons
        var serviceGrid = document.createElement('div');
        serviceGrid.id = 'qs-service-grid';
        serviceGrid.appendChild(cookBtn);
        serviceGrid.appendChild(medBtn);
        serviceGrid.appendChild(repairBtn);
        buttonsDiv.appendChild(serviceGrid);

        // Separator + ALL SERVICES inside buttonsDiv — matches Autobank layout
        buttonsDiv.appendChild(makeSeparator());
        var allBtn = makeButton('ALL SERVICES', 'df-btn-all-services');
        allBtn.addEventListener('click', function() { qsDoAll(); });
        buttonsDiv.appendChild(allBtn);

        return built.panel;
    }

    ///////////////////////////////////////////
    //  QuickBuy Panel                       //
    ///////////////////////////////////////////

    const highlightConfig = JSON.parse(localStorage.getItem('qb_highlightConfig') || '{}');

    const foodMedItems = [
        { label: 'Buy Whiskey', search: 'Whiskey', qty: 1, count: 1 },
        { label: 'Buy Nerotonin 8B', search: 'Nerotonin 8B', qty: 1, count: 1 },
        { label: 'Buy Energy Bar', search: 'Energy Bar', qty: 1, count: 1 },
        { label: 'Buy Repair Kit', search: 'Repair Kit', qty: 1, count: 1 }
    ];

    const ammoItems = [
        { label: '14mm Stack (1200)', search: '14mm Rifle Bullets', qty: 1200, count: 1 },
        { label: '12.7mm Stack (1200)', search: '12.7mm Rifle Bullets', qty: 1200, count: 1 },
        { label: '9mm Stack (1200)', search: '9mm Rifle Bullets', qty: 1200, count: 1 },
        { label: '.55 Stack (1600)', search: '.55 Handgun Bullets', qty: 1600, count: 1 },
        { label: 'Biomass Stack (1000)', search: 'Biomass', qty: 1000, count: 1 },
        { label: 'Energy Cell (1600)', search: 'Energy Cell', qty: 1600, count: 1 },
        { label: 'Grenade Stack (400)', search: 'Grenades', qty: 400, count: 1 },
        { label: 'Heavy Grenades (400)', search: 'Heavy Grenades', qty: 400, count: 1 },
        { label: 'Gasoline (4546)', search: 'Gasoline', qty: 4546, count: 1 },
        { label: '10 Gauge (800)', search: '10 Gauge Shells', qty: 800, count: 1 },
        { label: '12 Gauge (800)', search: '12 Gauge Shells', qty: 800, count: 1 },
        { label: '16 Gauge (800)', search: '16 Gauge Shells', qty: 800, count: 1 },
        { label: '20 Gauge (800)', search: '20 Gauge Shells', qty: 800, count: 1 }
    ];

    function buildQBSection(items) {
        var grid = document.createElement('div');
        grid.className = 'qb-grid';
        items.forEach(function(item) {
            var btn = makeButton(item.label, highlightConfig[item.search] ? 'qb-highlighted' : '');
            btn.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                if(highlightConfig[item.search]) {
                    delete highlightConfig[item.search];
                    btn.classList.remove('qb-highlighted');
                } else {
                    highlightConfig[item.search] = true;
                    btn.classList.add('qb-highlighted');
                }
                localStorage.setItem('qb_highlightConfig', JSON.stringify(highlightConfig));
            });
            btn.addEventListener('click', function() {
                // Check if the player has enough cash before navigating to the marketplace
                var userVars = getUserVars();
                if(userVars && parseInt(userVars.DFSTATS_df_cash) <= 0) {
                    showMoneyWarning();
                    return;
                }
                sessionStorage.setItem('quickBuy_pending', JSON.stringify({ term: item.search, qty: item.qty, count: item.count }));
                window.location.href = origin + path + '?page=35';
            });
            grid.appendChild(btn);
        });
        return grid;
    }

    function buildQuickBuyPanel() {
        var body = document.createElement('div');
        body.id = 'qb-body';
        body.className = 'df-panel-body';

        var built = makePanel('qb');
        makeHeader(built.inner, 'QUICK BUY', 'quickbuyCollapsed', body);
        built.inner.appendChild(body);

        var foodTitle = document.createElement('div');
        foodTitle.className = 'qb-section-title';
        foodTitle.textContent = 'FOOD / MEDICAL';
        body.appendChild(foodTitle);
        body.appendChild(buildQBSection(foodMedItems));
        body.appendChild(makeSeparator());

        var ammoTitle = document.createElement('div');
        ammoTitle.className = 'qb-section-title';
        ammoTitle.textContent = 'AMMO';
        body.appendChild(ammoTitle);
        body.appendChild(buildQBSection(ammoItems));

        return built.panel;
    }

    ///////////////////////////////////////////
    //  QuickBuy Purchase Logic              //
    ///////////////////////////////////////////

    function realClick(el) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    function waitForYesClick(cb) {
        var start = Date.now();
        (function poll() {
            var yes = Array.from(document.querySelectorAll('button'))
                .find(function(b) { return b.innerText.trim().toLowerCase() === 'yes'; });
            if(yes) { realClick(yes); if(cb) cb(); }
            else if(Date.now() - start < 5000) setTimeout(poll, 100);
        })();
    }

    function purchaseMultiple(term, qty, count) {
        var obs = new MutationObserver(function(_, o) {
            var items = Array.from(document.querySelectorAll('div.fakeItem'))
                .filter(function(d) {
                    return d.querySelector('.itemName')?.textContent.trim() === term &&
                        Number(d.getAttribute('data-quantity')) === qty;
                });
            if(items.length) {
                o.disconnect();
                var buyBtn = items[0].querySelector('button[data-action="buyItem"]');
                var i = 0;
                (function loop() {
                    if(i >= count) return;
                    realClick(buyBtn);
                    waitForYesClick(function() { i++; setTimeout(loop, 300); });
                })();
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    ///////////////////////////////////////////
    //  Layout & Positioning                 //
    ///////////////////////////////////////////

    function getRightColumnCell() {
        return document.querySelector("td.design2010[style*='right_margin.jpg']");
    }

    // Places the Boss Timer in a fixed position for pages that lack the right column
    function positionBossTimerFixed(btPanel) {
        btPanel.style.position = 'fixed';
        btPanel.style.top = '120px';
        btPanel.style.right = '10px';
        btPanel.style.width = '280px';
        btPanel.style.zIndex = '99999';
        document.body.appendChild(btPanel);
    }

    function positionPanels(btPanel, abPanel, qsPanel, qbPanel) {
        var rightTd = getRightColumnCell();
        if(!rightTd) return false;

        rightTd.style.position = 'relative';

        [btPanel, abPanel, qsPanel, qbPanel].forEach(function(p) {
            if(!p.parentElement || p.parentElement !== rightTd) rightTd.appendChild(p);
            p.style.position = 'absolute';
            p.style.left = '10px';
        });

        function reflow() {
            var tdWidth = rightTd.offsetWidth;
            var width = (tdWidth > 60 ? tdWidth - 20 : 420) + 'px';
            [btPanel, abPanel, qsPanel, qbPanel].forEach(function(p) { p.style.width = width; });

            var GAP = 8;
            var top = 120;
            btPanel.style.top = top + 'px'; top += btPanel.offsetHeight + GAP;
            abPanel.style.top = top + 'px'; top += abPanel.offsetHeight + GAP;
            qsPanel.style.top = top + 'px'; top += qsPanel.offsetHeight + GAP;
            qbPanel.style.top = top + 'px';
        }

        reflow();

        var ro = new ResizeObserver(reflow);
        [btPanel, abPanel, qsPanel, qbPanel, rightTd].forEach(function(el) { ro.observe(el); });
        if(window.visualViewport) window.visualViewport.addEventListener('resize', reflow);

        return true;
    }

    ///////////////////////////////////////////
    //  Init                                 //
    ///////////////////////////////////////////

    async function init() {
        // Special pages: show only the Boss Timer panel (no Devil Hound tracker)
        if(isBossTimerOnly) {
            var btPanelSpecial = buildBossPanel(true);

            function placeBT() {
                var rightTd = getRightColumnCell();
                if(rightTd) {
                    rightTd.style.position = 'relative';
                    rightTd.appendChild(btPanelSpecial);
                    btPanelSpecial.style.position = 'absolute';
                    btPanelSpecial.style.left = '10px';
                    btPanelSpecial.style.top = '120px';

                    function reflow() {
                        var w = rightTd.offsetWidth;
                        btPanelSpecial.style.width = (w > 60 ? w - 20 : 280) + 'px';
                    }
                    reflow();
                    var ro = new ResizeObserver(reflow);
                    ro.observe(rightTd);
                    if(window.visualViewport) window.visualViewport.addEventListener('resize', reflow);
                } else {
                    // No right column found — fall back to a fixed position
                    positionBossTimerFixed(btPanelSpecial);
                }
            }

            if(document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', placeBT);
            } else {
                placeBT();
            }

            console.log('DF Panels 2.0.1 - Boss Timer only');
            return;
        }

        // Normal pages: all four panels
        helpWindow = unsafeWindow.df_prompt;
        initUserData();
        await loadSavedMarketData();
        refreshServicesDataBank();
        window.addEventListener("beforeunload", saveMarketData);
        checkPendingAction();

        var btPanel = buildBossPanel();
        var abPanel = buildAutobankPanel();
        var qsPanel = buildQuickServicePanel();
        var qbPanel = buildQuickBuyPanel();

        function tryPlace(attempt) {
            attempt = attempt || 0;
            var ok = positionPanels(btPanel, abPanel, qsPanel, qbPanel);
            if(!ok && attempt < 20) setTimeout(function() { tryPlace(attempt + 1); }, 200);
        }
        setTimeout(tryPlace, 500);

        // QuickBuy: execute any pending purchase from a previous page navigation
        var p = sessionStorage.getItem('quickBuy_pending');
        if(p && window.location.search.includes('page=35')) {
            var pending = JSON.parse(p);
            sessionStorage.removeItem('quickBuy_pending');
            var input = document.querySelector('#searchField');
            var mk = document.querySelector('#makeSearch');
            if(input && mk) {
                input.value = pending.term;
                realClick(mk);
                setTimeout(function() { purchaseMultiple(pending.term, pending.qty, pending.count); }, 500);
            }
        }

        console.log("DF Panels 2.0.1 - Loaded successfully!");
    }

    // Special pages: run on DOMContentLoaded so the panel appears immediately
    // Normal pages: run on load so the game has time to initialize unsafeWindow variables
    if(isBossTimerOnly) {
        if(document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    } else {
        window.addEventListener('load', init);
    }

})();
