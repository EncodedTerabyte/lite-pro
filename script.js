let editor;
let Proposals = [];
let currentTab = null;
let tabs = [];

const luaIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color: #58A6FF;">
    <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"/>
    <circle cx="8" cy="17" r="2" opacity="0.7"/>
    <circle cx="16" cy="17" r="2" opacity="0.7"/>
</svg>`;

class Tab {
    constructor(title, content = '') {
        this.id = 'tab-' + Math.random().toString(36).substr(2, 9);
        this.title = title;
        this.content = content;
        this.element = null;
        this.isDirty = false;
        this.isNew = true;
    }
}

function saveTabs() {
    try {
        const tabsData = tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            content: tab.content,
            isDirty: tab.isDirty
        }));
        localStorage.setItem('unixEditorTabs', JSON.stringify(tabsData));
    } catch (error) {
        console.warn('Failed to save tabs to localStorage:', error);
    }
}

function loadTabs() {
    try {
        const savedTabs = localStorage.getItem('unixEditorTabs');
        if (savedTabs) {
            const tabsData = JSON.parse(savedTabs);
            tabsData.forEach(tabData => {
                addTab(tabData.title, tabData.content, tabData.id, tabData.isDirty);
            });
        }
    } catch (error) {
        console.warn('Failed to load tabs from localStorage:', error);
    }

    if (tabs.length === 0) {
        addTab('main.lua');
    }
}

function makeEditable(titleElement, tab) {
    titleElement.contentEditable = true;
    titleElement.classList.add('editing');
    titleElement.focus();
    
    const range = document.createRange();
    range.selectNodeContents(titleElement);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function finishEditing() {
        titleElement.contentEditable = false;
        titleElement.classList.remove('editing');
        const newTitle = titleElement.textContent.trim();
        if (newTitle && newTitle !== tab.title) {
            tab.title = newTitle;
            saveTabs();
        } else {
            titleElement.textContent = tab.title;
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        }
        if (e.key === 'Escape') {
            titleElement.textContent = tab.title;
            finishEditing();
        }
    };

    titleElement.onblur = finishEditing;
    titleElement.onkeydown = handleKeyDown;
}

function createTabElement(tab) {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    if (tab.isNew) {
        tabElement.classList.add('new');
        tab.isNew = false;
    }
    tabElement.setAttribute('data-tab-id', tab.id);
    
    const iconElement = document.createElement('div');
    iconElement.className = 'tab-icon';
    iconElement.innerHTML = luaIcon;
    
    const titleElement = document.createElement('div');
    titleElement.className = 'tab-title';
    titleElement.textContent = tab.title + (tab.isDirty ? ' •' : '');
    
    titleElement.ondblclick = (e) => {
        e.stopPropagation();
        makeEditable(titleElement, tab);
    };
    
    const closeButton = document.createElement('div');
    closeButton.className = 'tab-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close tab';
    closeButton.onclick = (e) => {
        e.stopPropagation();
        removeTab(tab.id);
    };
    
    tabElement.appendChild(iconElement);
    tabElement.appendChild(titleElement);
    if (tabs.length > 1 || tab.isDirty) {
        tabElement.appendChild(closeButton);
    }
    
    tabElement.onclick = () => switchTab(tab.id);
    
    return tabElement;
}

function createNewTabButton() {
    const newTabButton = document.createElement('div');
    newTabButton.className = 'tab new-tab';
    newTabButton.innerHTML = '+';
    newTabButton.title = 'New tab';
    newTabButton.onclick = () => {
        const tabCount = tabs.length + 1;
        const newTab = addTab(`script${tabCount}.lua`);

        setTimeout(() => {
            const titleElement = newTab.element.querySelector('.tab-title');
            if (titleElement) makeEditable(titleElement, newTab);
        }, 100);
    };
    return newTabButton;
}

function addTab(title, content = '', id = null, isDirty = false) {
    const defaultText = `print("Hello, World!)`;
    
    if (!content.trim()) {
        content = defaultText;
    }
    
    const tab = new Tab(title, content);
    if (id) tab.id = id;
    tab.isDirty = isDirty;
    tabs.push(tab);
    
    const tabsContainer = document.getElementById('tabs-container');
    const newTabButton = tabsContainer.querySelector('.new-tab');
    
    tab.element = createTabElement(tab);
    
    if (newTabButton) {
        tabsContainer.insertBefore(tab.element, newTabButton);
    } else {
        tabsContainer.appendChild(tab.element);
        tabsContainer.appendChild(createNewTabButton());
    }
    
    switchTab(tab.id);
    saveTabs();
    return tab;
}

function removeTab(tabId) {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tab = tabs[tabIndex];

    if (tabs.length <= 1) {
        tab.content = '';
        tab.isDirty = false;
        editor.setValue('');
        saveTabs();
        return;
    }

    if (tab.isDirty) {
        if (!confirm(`Tab "${tab.title}" has unsaved changes. Close anyway?`)) {
            return;
        }
    }
    
    tab.element.classList.add('removing');
    
    setTimeout(() => {
        tabs.splice(tabIndex, 1);
        tab.element.remove();
        
        if (currentTab === tabId) {
            const newIndex = Math.min(tabIndex, tabs.length - 1);
            switchTab(tabs[newIndex].id);
        }
        saveTabs();
    }, 250);
}

function switchTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (currentTab && currentTab !== tabId) {
        const oldTab = tabs.find(t => t.id === currentTab);
        if (oldTab) {
            oldTab.content = editor.getValue();
            saveTabs();
        }
    }

    tabs.forEach(t => {
        if (t.element) {
            t.element.classList.remove('active');
        }
    });

    if (tab.element) {
        tab.element.classList.add('active');
    }

    const contentToSet = tab.content || `print("Hello, World");`;
    editor.setValue(contentToSet);
    
    currentTab = tabId;

    document.title = `Unix - ${tab.title}`;
}

function updateTabTitle(tab, isDirty = null) {
    if (!tab.element) return;
    
    if (isDirty !== null) {
        tab.isDirty = isDirty;
    }
    
    const titleElement = tab.element.querySelector('.tab-title');
    if (titleElement && !titleElement.classList.contains('editing')) {
        titleElement.textContent = tab.title + (tab.isDirty ? ' •' : '');
    }
}

function setupAutosave() {
    let saveTimeout;
    let lastContent = '';
    
    editor.onDidChangeModelContent(() => {
        clearTimeout(saveTimeout);
        
        const currentContent = editor.getValue();
        const hasChanges = currentContent !== lastContent;
        
        if (currentTab && hasChanges) {
            const tab = tabs.find(t => t.id === currentTab);
            if (tab) {
                updateTabTitle(tab, true);
            }
        }
        
        saveTimeout = setTimeout(() => {
            if (currentTab) {
                const tab = tabs.find(t => t.id === currentTab);
                if (tab) {
                    tab.content = currentContent;
                    lastContent = currentContent;
                    saveTabs();
                }
            }
        }, 500);
    });
}

var enableAntiSkid, disableAntiSkid, SetText, ShowMinimap, HideMinimap;
var EnableAutoComplete, DisableAutoComplete, GetText, AddIntellisense, Refresh;

require.config({
    paths: {
        'vs': 'vs'
    }
});

require(['vs/editor/editor.main'], function () {
    function getDependencyProposals() {
        return Proposals;
    }

    monaco.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems: function (model, position) {
            return getDependencyProposals();
        },
        triggerCharacters: ['.', ':', '"'],
    });

    monaco.editor.defineTheme('unix-theme', {
        base: 'vs-dark',
        inherit: true,
        colors: {
            "editor.background": '#0B0F14',
            "editor.foreground": '#F0F6FF',
            "editorLineNumber.foreground": '#6E7681',
            "editorLineNumber.activeForeground": '#8B949E',
            "editor.lineHighlightBackground": '#111722',
            "editor.selectionBackground": '#2858A6FF',
            "editor.inactiveSelectionBackground": '#1A2332',
            "editorCursor.foreground": '#58A6FF',
            "scrollbarSlider.background": '#8B949E80',
            "scrollbarSlider.hoverBackground": '#C9D1D9A0',
            "editorWidget.background": '#1A2332',
            "editorWidget.border": '#30363D',
            "editorSuggestWidget.background": '#1A2332',
            "editorSuggestWidget.border": '#58A6FF',
        },
        rules: [
            { token: 'comment', foreground: '8B949E', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'A5A3FF', fontStyle: 'bold' },
            { token: 'string', foreground: '3FB950' },
            { token: 'number', foreground: 'F99157' },
            { token: 'identifier', foreground: 'F0F6FF' },
            { token: 'global', foreground: '58A6FF', fontStyle: 'bold' },
            { token: 'method', foreground: 'FFA1DC' },
        ]
    });

    editor = monaco.editor.create(document.getElementById('container'), {
        language: 'lua',
        theme: 'unix-theme',
        acceptSuggestionOnEnter: "smart",
        cursorSmoothCaretAnimation: "on",
        suggestOnTriggerCharacters: true,
        suggestSelection: "recentlyUsed",
        folding: true,
        dragAndDrop: true,
        links: false,
        minimap: { enabled: false },
        showFoldingControls: "always",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        fontLigatures: true,
        formatOnPaste: true,
        showDeprecated: true,
        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
        fontSize: 14,
        lineHeight: 24,
        padding: { top: 20, bottom: 20 },
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            useShadows: true,
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
        },
        suggest: {
            snippetsPreventQuickSuggestions: false,
        }
    });

    loadTabs();
    setupAutosave();

    EnableAutoComplete = function() {
        editor.updateOptions({
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "smart",
            wordBasedSuggestions: "on"
        });
    };

    DisableAutoComplete = function() {
        editor.updateOptions({
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: "off",
            wordBasedSuggestions: "off"
        });
    };

    ShowMinimap = function() {
        editor.updateOptions({ minimap: { enabled: true } });
    };

    HideMinimap = function() {
        editor.updateOptions({ minimap: { enabled: false } });
    };

    function handleover() {
        document.body.style.filter = "blur(0px)";
    }
    
    function handleleave() {
        document.body.style.filter = "blur(3px)";
    }
    
    enableAntiSkid = function() {
        document.body.style.filter = "blur(3px)";
        document.body.addEventListener("mouseover", handleover);
        document.body.addEventListener("mouseleave", handleleave);
    };
    
    disableAntiSkid = function() {
        document.body.style.filter = "blur(0px)";
        document.body.removeEventListener("mouseover", handleover, false);
        document.body.removeEventListener("mouseleave", handleleave, false);
    };

    editor.onDidChangeModelContent(function (e) {
        try {
            if (typeof luaparse !== 'undefined') {
                luaparse.parse(editor.getValue());
                monaco.editor.setModelMarkers(editor.getModel(), 'luaparse', []);
            }
        } catch(err) {
            if (typeof luaparse !== 'undefined') {
                monaco.editor.setModelMarkers(editor.getModel(), 'luaparse', [{
                    startLineNumber: err.line || 1,
                    startColumn: err.column || 1,
                    endLineNumber: err.line || 1,
                    endColumn: err.column || 1,
                    message: err.message || 'Syntax error',
                    severity: 8
                }]);
            }
        }
    });

    GetText = function() {
        return editor.getValue();
    };

    SetText = function(text) {
        editor.setValue(text || '');
        if (currentTab) {
            const tab = tabs.find(t => t.id === currentTab);
            if (tab) {
                tab.content = text || '';
                updateTabTitle(tab, false);
                saveTabs();
            }
        }
    };

    AddIntellisense = function(label, kind, detail, insertText) {
        let completionKind;
        switch (kind) {
            case "Class": completionKind = monaco.languages.CompletionItemKind.Class; break;
            case "Color": completionKind = monaco.languages.CompletionItemKind.Color; break;
            case "Constructor": completionKind = monaco.languages.CompletionItemKind.Constructor; break;
            case "Enum": completionKind = monaco.languages.CompletionItemKind.Enum; break;
            case "Field": completionKind = monaco.languages.CompletionItemKind.Field; break;
            case "File": completionKind = monaco.languages.CompletionItemKind.File; break;
            case "Folder": completionKind = monaco.languages.CompletionItemKind.Folder; break;
            case "Function": completionKind = monaco.languages.CompletionItemKind.Function; break;
            case "Interface": completionKind = monaco.languages.CompletionItemKind.Interface; break;
            case "Keyword": completionKind = monaco.languages.CompletionItemKind.Keyword; break;
            case "Method": completionKind = monaco.languages.CompletionItemKind.Method; break;
            case "Module": completionKind = monaco.languages.CompletionItemKind.Module; break;
            case "Property": completionKind = monaco.languages.CompletionItemKind.Property; break;
            case "Reference": completionKind = monaco.languages.CompletionItemKind.Reference; break;
            case "Snippet": completionKind = monaco.languages.CompletionItemKind.Snippet; break;
            case "Text": completionKind = monaco.languages.CompletionItemKind.Text; break;
            case "Unit": completionKind = monaco.languages.CompletionItemKind.Unit; break;
            case "Value": completionKind = monaco.languages.CompletionItemKind.Value; break;
            case "Variable": completionKind = monaco.languages.CompletionItemKind.Variable; break;
            default: completionKind = monaco.languages.CompletionItemKind.Text; break;
        }

        Proposals.push({
            label: label,
            kind: completionKind,
            detail: detail,
            insertText: insertText || label,
            documentation: detail
        });
    };

    Refresh = function() {
        const text = GetText();
        SetText("");
        editor.trigger('keyboard', 'type', { text: text });
    };

    window.addEventListener('resize', function() {
        editor.layout();
    });

    async function loadIntellisenseData() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/iceycold3/monaco/refs/heads/main/lib.json');
            const docs = await response.json();

            for (const prop in docs) {
                for (const item in docs[prop]) {
                    const document = docs[prop][item];
                    AddIntellisense(document.label, document.type, document.description, document.insert);
                }
            }

            const luaKeywords = ["_G", "_VERSION", "Enum", "game", "plugin", "shared", "script", "workspace", 
                                "DebuggerManager", "elapsedTime", "LoadLibrary", "PluginManager", "settings", 
                                "tick", "time", "typeof", "UserSettings"];
            luaKeywords.forEach(keyword => AddIntellisense(keyword, "Keyword", keyword, keyword));

            const luaControlFlow = ["and", "break", "do", "else", "elseif", "end", "false", "for", "function", 
                                   "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", 
                                   "until", "while"];
            luaControlFlow.forEach(keyword => AddIntellisense(keyword, "Variable", keyword, keyword));

            const luaMethods = ["math.abs", "math.acos", "math.asin", "math.atan", "math.atan2", "math.ceil", 
                               "math.cos", "math.cosh", "math.deg", "math.exp", "math.floor", "math.fmod", 
                               "math.frexp", "math.huge", "math.ldexp", "math.log", "math.max", "math.min", 
                               "math.modf", "math.pi", "math.pow", "math.rad", "math.random", "math.randomseed", 
                               "math.sin", "math.sinh", "math.sqrt", "math.tan", "math.tanh", "table.concat", 
                               "table.foreach", "table.foreachi", "table.sort", "table.insert", "table.remove"];
            luaMethods.forEach(method => AddIntellisense(method, "Method", method, method));

            const luaClasses = ["Drawing", "debug", "Instance", "Color3", "Vector3", "Vector2", "BrickColor", 
                               "math", "table", "string", "coroutine", "Humanoid", "ClickDetector", "LocalScript", 
                               "Model", "ModuleScript", "Mouse", "Part", "Player", "Script", "Tool", "RunService", 
                               "UserInputService", "Workspace"];
            luaClasses.forEach(cls => AddIntellisense(cls, "Class", cls, cls));

            const luaFunctions = ["print", "warn", "wait", "info", "printidentity", "assert", "collectgarbage", 
                                 "error", "getfenv", "getmetatable", "setmetatable", "ipairs", "loadfile", 
                                 "loadstring", "newproxy", "next", "pairs", "pcall", "spawn", "rawequal", 
                                 "rawget", "rawset", "select", "tonumber", "tostring", "type", "unpack", "xpcall", 
                                 "delay", "stats"];
            luaFunctions.forEach(func => AddIntellisense(func, "Function", func, func));

        } catch (error) {
            console.warn('Failed to load intellisense data:', error);
        }
    }

    loadIntellisenseData();

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() {
        if (currentTab) {
            const tab = tabs.find(t => t.id === currentTab);
            if (tab) {
                updateTabTitle(tab, false);
                saveTabs();
            }
        }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, function() {
        const tabCount = tabs.length + 1;
        addTab(`script${tabCount}.lua`);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, function() {
        if (currentTab) {
            removeTab(currentTab);
        }
    });

    let tabSwitchIndex = 0;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Tab, function() {
        if (tabs.length > 1) {
            tabSwitchIndex = (tabSwitchIndex + 1) % tabs.length;
            switchTab(tabs[tabSwitchIndex].id);
        }
    });

    console.log('Unix Editor initialized successfully');
});