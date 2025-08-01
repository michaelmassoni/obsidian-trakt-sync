"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceCode = getDeviceCode;
exports.pollForToken = pollForToken;
exports.getTraktHistory = getTraktHistory;
var axios_1 = require("axios");
var TRAKT_API_BASE = "https://api.trakt.tv";
function getDeviceCode(clientId) {
    return __awaiter(this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default.post("".concat(TRAKT_API_BASE, "/oauth/device/code"), { client_id: clientId }, { headers: { "Content-Type": "application/json" } })];
                case 1:
                    res = _a.sent();
                    return [2 /*return*/, res.data];
            }
        });
    });
}
function pollForToken(clientId, clientSecret, deviceCode, interval) {
    return __awaiter(this, void 0, void 0, function () {
        var res, token, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!true) return [3 /*break*/, 6];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, interval * 1000); })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, axios_1.default.post("".concat(TRAKT_API_BASE, "/oauth/device/token"), {
                            code: deviceCode,
                            client_id: clientId,
                            client_secret: clientSecret,
                        }, { headers: { "Content-Type": "application/json" } })];
                case 3:
                    res = _a.sent();
                    if (res.status === 200) {
                        token = res.data;
                        token.expires_at = Date.now() / 1000 + token.expires_in;
                        return [2 /*return*/, token];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    if (e_1.response && e_1.response.status === 400) {
                        // Authorization pending
                        return [3 /*break*/, 0];
                    }
                    else {
                        throw e_1;
                    }
                    return [3 /*break*/, 5];
                case 5: return [3 /*break*/, 0];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function getTraktHistory(accessToken, clientId) {
    return __awaiter(this, void 0, void 0, function () {
        var allItems, page, perPage, res, items;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    allItems = [];
                    page = 1;
                    perPage = 100;
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [4 /*yield*/, axios_1.default.get("".concat(TRAKT_API_BASE, "/sync/history?limit=").concat(perPage, "&page=").concat(page), {
                            headers: {
                                "Content-Type": "application/json",
                                "trakt-api-version": "2",
                                "trakt-api-key": clientId,
                                Authorization: "Bearer ".concat(accessToken),
                            },
                        })];
                case 2:
                    res = _a.sent();
                    items = res.data;
                    if (!items.length)
                        return [3 /*break*/, 3];
                    allItems = allItems.concat(items);
                    if (items.length < perPage)
                        return [3 /*break*/, 3];
                    page++;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, allItems];
            }
        });
    });
}
