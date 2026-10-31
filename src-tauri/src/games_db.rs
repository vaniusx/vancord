// Known game executables for launchers other than Steam.
//
// Steam has a manifest per app, so its name, id and install folder are read from
// disk. Other launchers do not expose an equivalent, so this table maps a process
// name to the game it belongs to. It only needs to cover titles people actually
// play; anything missing falls back to the manual picker.

pub struct KnownGame {
    /// Lowercase executable name, e.g. "league of legends.exe".
    pub process: &'static str,
    pub name: &'static str,
    /// Launcher family, shown as a small label in the client.
    pub launcher: &'static str,
}

macro_rules! game {
    ($process:expr, $name:expr, $launcher:expr) => {
        KnownGame {
            process: $process,
            name: $name,
            launcher: $launcher,
        }
    };
}

pub const KNOWN_GAMES: &[KnownGame] = &[
    // Riot
    game!("league of legends.exe", "League of Legends", "Riot"),
    game!("leagueclient.exe", "League of Legends", "Riot"),
    game!("valorant-win64-shipping.exe", "VALORANT", "Riot"),
    game!("teamfight tactics.exe", "Teamfight Tactics", "Riot"),
    game!("legends of runeterra.exe", "Legends of Runeterra", "Riot"),
    // Epic
    game!("fortniteclient-win64-shipping.exe", "Fortnite", "Epic"),
    game!("rocketleague.exe", "Rocket League", "Epic"),
    game!("fallguys_client_game.exe", "Fall Guys", "Epic"),
    game!("amongus.exe", "Among Us", "Epic"),
    // Battle.net
    game!("overwatch.exe", "Overwatch 2", "Battle.net"),
    game!("world of warcraft.exe", "World of Warcraft", "Battle.net"),
    game!("diablo iv.exe", "Diablo IV", "Battle.net"),
    game!("hearthstone.exe", "Hearthstone", "Battle.net"),
    game!("starcraft ii.exe", "StarCraft II", "Battle.net"),
    game!("cod.exe", "Call of Duty", "Battle.net"),
    // EA
    game!("bf2042.exe", "Battlefield 2042", "EA"),
    game!("r5apex.exe", "Apex Legends", "EA"),
    game!("apex_legend.exe", "Apex Legends", "EA"),
    game!("thesims4.exe", "The Sims 4", "EA"),
    // Ubisoft
    game!("rainbowsix.exe", "Rainbow Six Siege", "Ubisoft"),
    game!("rainbowsix_dx11.exe", "Rainbow Six Siege", "Ubisoft"),
    game!("rainbowsix_vulkan.exe", "Rainbow Six Siege", "Ubisoft"),
    game!("acvalhalla.exe", "Assassin's Creed Valhalla", "Ubisoft"),
    game!("farcry6.exe", "Far Cry 6", "Ubisoft"),
    // GOG and Rockstar
    game!("witcher3.exe", "The Witcher 3", "GOG"),
    game!("cyberpunk2077.exe", "Cyberpunk 2077", "GOG"),
    game!("bg3.exe", "Baldur's Gate 3", "GOG"),
    game!("bg3_dx11.exe", "Baldur's Gate 3", "GOG"),
    game!("gta5.exe", "Grand Theft Auto V", "Rockstar"),
    game!("rdr2.exe", "Red Dead Redemption 2", "Rockstar"),
    game!("fivem.exe", "FiveM", "Standalone"),
    // Standalone and MMO
    game!("minecraft.exe", "Minecraft", "Standalone"),
    game!("robloxplayerbeta.exe", "Roblox", "Standalone"),
    game!("tslgame.exe", "PUBG", "Standalone"),
    game!("eldenring.exe", "Elden Ring", "Standalone"),
    game!("warframe.x64.exe", "Warframe", "Standalone"),
    game!("pathofexile.exe", "Path of Exile", "Standalone"),
    game!("pathofexile_x64.exe", "Path of Exile", "Standalone"),
    game!("guildwars2-64.exe", "Guild Wars 2", "Standalone"),
    // Steam titles worth naming a launcher for
    game!("dota2.exe", "Dota 2", "Steam"),
    game!("cs2.exe", "Counter-Strike 2", "Steam"),
    game!("rustclient.exe", "Rust", "Steam"),
    game!("terraria.exe", "Terraria", "Steam"),
    game!("stardew valley.exe", "Stardew Valley", "Steam"),
    game!("factorio.exe", "Factorio", "Steam"),
    game!("phasmophobia.exe", "Phasmophobia", "Steam"),
    game!("lethal company.exe", "Lethal Company", "Steam"),
    game!("helldivers2.exe", "Helldivers 2", "Steam"),
    game!("palworld-win64-shipping.exe", "Palworld", "Steam"),
    game!("destiny2.exe", "Destiny 2", "Steam"),
    game!("eurotrucks2.exe", "Euro Truck Simulator 2", "Steam"),
    game!("beamng.drive.x64.exe", "BeamNG.drive", "Steam"),
    game!("deadbydaylight-win64-shipping.exe", "Dead by Daylight", "Steam"),
];

/// Look up a running process name in the known-games table.
pub fn lookup(process: &str) -> Option<&'static KnownGame> {
    KNOWN_GAMES
        .iter()
        .find(|entry| entry.process.eq_ignore_ascii_case(process))
}
