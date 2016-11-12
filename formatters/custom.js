define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "settings", "save", "collab", "tabManager", "dialog.error", "format"
    ];
    main.provides = ["format.custom"];
    return main;

    function main(options, imports, register) {
        var settings = imports.settings;
        var tabs = imports.tabManager;
        var save = imports.save;
        var format = imports.format;
        var collab = imports.collab;
        var showError = imports["dialog.error"].show;
        var Plugin = imports.Plugin;
        var plugin = new Plugin("Ajax.org", main.consumes);
        
        var ERROR_NOT_FOUND = 127;
        
        function load() {
            collab.on("beforeSave", beforeSave, plugin);
            collab.on("postProcessorError", function(e) {
                var mode = getMode(e.docId) || "language";
                if (e.code !== ERROR_NOT_FOUND)
                    return console.error("Error running formatter for " + mode + ": " + (e.stderr || e.code));
                showError("Error running code formatter for " + mode + ": formatter not found, please check your project settings");
            });
            format.on("format", function(e) {
                if (!settings.get("project/" + e.mode + "/@formatOnSave"))
                    return;
                if (e.mode === "javascript" && settings.getBool("project/javascript/@jsbeautify"))
                    return; // use built-in JS Beautify instead
                save.save(tabs.currentTab);
                return true;
            }, plugin);
        }
        
        function beforeSave(e) {
            var mode = getMode(e.docId);
            var enabled = settings.getBool("project/" + mode + "/@formatOnSave");
            if (!enabled)
                return;
            if (mode === "javascript" && settings.getBool("project/javascript/@jsbeautify"))
                return; // use built-in JS Beautify instead
            var formatter = settings.get("project/" + mode + "/@formatter");
            if (!formatter)
                return showError("No code formatter set for " + mode + ": please check your project settings");
            e.postProcessor = {
                command: "bash",
                args: ["-c", formatter]
            };
        }
        
        function getMode(docId) {
            var tab = tabs.findTab(docId);
            if (!tab || !tab.editor || !tab.editor.ace)
                return;
            return tab.editor.ace.session.syntax;
        }
        
        plugin.on("load", function() {
            load();
        });
        plugin.on("unload", function() {
            
        });
        
        /**
         * Custom code formatter extension
         *
         * Reformats code in the current document on save
         */
        plugin.freezePublicAPI({});
        
        register(null, {
            "format.custom": plugin
        });
    }
});