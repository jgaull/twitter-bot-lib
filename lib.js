/**
 * TwitterBot.js
 * =====================
 * Twitter Bot made with love and nodejs
 *
 * @author:     Patryk Rzucidlo [@ptkdev] <support@ptkdev.io> (https://ptkdev.it)
 * @file:       bot.js
 * @version:    0.1.0
 *
 * @license:    Code and contributions have 'GNU General Public License v3'
 *              This program is free software: you can redistribute it and/or modify
 *              it under the terms of the GNU General Public License as published by
 *              the Free Software Foundation, either version 3 of the License, or
 *              (at your option) any later version.
 *              This program is distributed in the hope that it will be useful,
 *              but WITHOUT ANY WARRANTY; without even the implied warranty of
 *              MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *              GNU General Public License for more details.
 *              You should have received a copy of the GNU General Public License
 *              along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @link        Homepage:     https://twitter.bot.ptkdev.io
 *              GitHub Repo:  https://github.com/social-manager-tools/twitter-bot-lib
 */

/**
 * Libs
 * =====================
 * Open source library
 *
 * @link: https://github.com/GoogleChrome/puppeteer
 * 
 */
module.exports = function(config) {
    this.config = config;
    this.start = async function() {
        var bot = null;
        let config = this.config;
        const puppeteer = require("puppeteer");
        const version = require("./version");
        const LOG = require("./modules/logger/types");
        let browser = null;

        /**
         * Init
         * =====================
         * Set config options, check updates and integrity of bot
         *
         */
        let check = require("./modules/common/utils")(bot, config);
        if(config.ui === true){
            config = check.fixui(config);
        }else{
            config = check.fixconfig(config);
        }
        config = check.default_config(config);
        check.donate();
        check.check_updates(version.version);
        if (config.executable_path === "" || config.executable_path === false) {
            browser = await puppeteer.launch({
                headless: config.chrome_headless,
                args: config.chrome_options
            });
        } else {
            browser = await puppeteer.launch({
                headless: config.chrome_headless,
                args: config.chrome_options,
                executablePath: config.executable_path
            });
        }
        bot = await browser.newPage();

        /**
         * Import libs
         * =====================
         * Modules of bot from folder ./modules
         *
         */
        let routes = require("./routes/strategies");
        let utils = require("./modules/common/utils")(bot, config);
        let Log = require("./modules/logger/Log");
        let log = new Log("switch_mode", config);
        let login = require("./modules/mode/login.js")(bot, config, utils);
        let twofa = require("./modules/mode/2fa.js")(bot, config, utils);

        /**
         * Switch Mode
         * =====================
         * Switch social algorithms, change algorithm from config.js
         *
         */
        async function switch_mode(log) {
            let strategy = routes[config.bot_mode];
            if (strategy !== undefined) {
                const strat = strategy(bot, config, utils);

                if (typeof config.onLoadStrategy === 'function') {
                    config.onLoadStrategy(strat);
                }

                await strat.start();
            } else {
                log(LOG.ERROR, "switch_mode", `mode ${strategy} not exist!`);
            }
        }

        /**
         * Start Bot (flow) 
         * =====================
         * Login --> Check 2FA (sms pin) --> social algorithm from config.js
         *
         */
        await login.start();

        if (login.is_ok()) {
            await twofa.start_twofa_check();
            
            // twofa is enabled
            if (twofa.is_ok()) {
                await twofa.start();
                await switch_mode(log);
            // twofa is disabled, bot start correctly
            }else{
                await switch_mode(log);
            }

            //await bot.close();
        }

    };
};