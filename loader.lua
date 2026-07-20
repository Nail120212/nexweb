-- Nexxto Hub Loader - with Auto Pause/Resume support
-- Website: https://nexxtohub.vercel.app/

local function getHWID()
    local hwid = nil
    pcall(function()
        if gethwid then hwid = gethwid()
        elseif get_hwid then hwid = get_hwid()
        elseif syn and syn.get_hwid then hwid = syn.get_hwid()
        end
    end)
    if not hwid then
        pcall(function()
            hwid = game:GetService("RbxAnalyticsService"):GetClientId()
        end)
    end
    return hwid or "unknown"
end

local HWID = getHWID()
local API = "https://nexxtohub.vercel.app"

-- Report exec for counter (website only)
pcall(function()
    local req = (syn and syn.request) or (http_request) or (request) or (http and http.request)
    if req then
        req({Url = API.."/api/stats", Method = "POST", Headers = {["Content-Type"]="application/json"}, Body = "{}"})
    else
        game:HttpGet(API.."/api/stats?inc=1")
    end
end)

-- Optional whitelist check via API (checks active=true)
-- If you want loader to block when paused/offline, uncomment below:
--[[
local success, response = pcall(function()
    return game:HttpGet(API.."/api/whitelist/verify?hwid="..HWID)
end)
if success and response then
    if response:find("not_whitelisted") or response:find("paused") then
        warn("[Nexxto] Not whitelisted or paused. Come online with https://dsc.gg/nexxto")
        return
    end
end
]]

print("[Nexxto] HWID:", HWID)
print("[Nexxto] Loading hub...")

-- Load main hub
local ok, err = pcall(function()
    loadstring(game:HttpGet("https://nexxtohub.vercel.app/loader"))()
end)

if not ok then
    -- fallback local hub
    loadstring(game:HttpGet("https://nexxtohub.vercel.app/loader"))()))()
end
