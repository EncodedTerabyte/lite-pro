let Editor;
let Proposals = [];
let CurrentTab = null;
let Tabs = [];

class Tab {
    constructor(Title, Content = '') {
        this.Id = 'tab-' + Math.random().toString(36).substr(2, 9);
        this.Title = Title;
        this.Content = Content;
        this.Element = null;
        this.IsDirty = false;
        this.IsNew = true;
    }
}

function MakeEditable(TitleElement, TabObj) {
    TitleElement.contentEditable = true;
    TitleElement.classList.add('editing');
    TitleElement.focus();
    
    const Range = document.createRange();
    Range.selectNodeContents(TitleElement);
    const Sel = window.getSelection();
    Sel.removeAllRanges();
    Sel.addRange(Range);

    function FinishEditing() {
        TitleElement.contentEditable = false;
        TitleElement.classList.remove('editing');
        const NewTitle = TitleElement.textContent.trim();
        if (NewTitle && NewTitle !== TabObj.Title) {
            TabObj.Title = NewTitle;
        } else {
            TitleElement.textContent = TabObj.Title;
        }
    }

    const HandleKeyDown = (E) => {
        if (E.key === 'Enter') {
            E.preventDefault();
            FinishEditing();
        }
        if (E.key === 'Escape') {
            TitleElement.textContent = TabObj.Title;
            FinishEditing();
        }
    };

    TitleElement.onblur = FinishEditing;
    TitleElement.onkeydown = HandleKeyDown;
}

function CreateTabElement(TabObj) {
    const TabElement = document.createElement('div');
    TabElement.className = 'tab';
    if (TabObj.IsNew) {
        TabElement.classList.add('new');
        TabObj.IsNew = false;
    }
    TabElement.setAttribute('data-tab-id', TabObj.Id);
    
    const IconElement = document.createElement('div');
    IconElement.className = 'tab-icon';
    const IconImg = document.createElement('img');
    IconImg.src = './luaicon.png';
    IconImg.alt = 'Lua';
    IconElement.appendChild(IconImg);
    
    const TitleElement = document.createElement('div');
    TitleElement.className = 'tab-title';
    TitleElement.textContent = TabObj.Title + (TabObj.IsDirty ? ' •' : '');
    
    TitleElement.ondblclick = (E) => {
        E.stopPropagation();
        MakeEditable(TitleElement, TabObj);
    };
    
    const CloseButton = document.createElement('div');
    CloseButton.className = 'tab-close';
    CloseButton.innerHTML = '×';
    CloseButton.title = 'Close tab';
    CloseButton.onclick = (E) => {
        E.stopPropagation();
        RemoveTab(TabObj.Id);
    };
    
    TabElement.appendChild(IconElement);
    TabElement.appendChild(TitleElement);
    if (Tabs.length > 1 || TabObj.IsDirty) {
        TabElement.appendChild(CloseButton);
    }
    
    TabElement.onclick = () => SwitchTab(TabObj.Id);
    
    return TabElement;
}

function CreateNewTabButton() {
    const NewTabButton = document.createElement('div');
    NewTabButton.className = 'tab new-tab';
    NewTabButton.innerHTML = '+';
    NewTabButton.title = 'New tab';
    NewTabButton.onclick = () => {
        const TabCount = Tabs.length + 1;
        const NewTab = AddTab(`script${TabCount}.lua`);

        setTimeout(() => {
            const TitleElement = NewTab.Element.querySelector('.tab-title');
            if (TitleElement) MakeEditable(TitleElement, NewTab);
        }, 100);
    };
    return NewTabButton;
}

function AddTab(Title, Content = '', Id = null, IsDirty = false) {
    const DefaultText = `print("Hello, World!")`;
    
    if (!Content.trim()) {
        Content = DefaultText;
    }
    
    const TabObj = new Tab(Title, Content);
    if (Id) TabObj.Id = Id;
    TabObj.IsDirty = IsDirty;
    Tabs.push(TabObj);
    
    const TabsContainer = document.getElementById('tabs-container');
    const NewTabButton = TabsContainer.querySelector('.new-tab');
    
    TabObj.Element = CreateTabElement(TabObj);
    
    if (NewTabButton) {
        TabsContainer.insertBefore(TabObj.Element, NewTabButton);
    } else {
        TabsContainer.appendChild(TabObj.Element);
        TabsContainer.appendChild(CreateNewTabButton());
    }
    
    SwitchTab(TabObj.Id);
    return TabObj;
}

function RemoveTab(TabId) {
    const TabIndex = Tabs.findIndex(T => T.Id === TabId);
    if (TabIndex === -1) return;
    
    const TabObj = Tabs[TabIndex];

    if (Tabs.length <= 1) {
        TabObj.Content = '';
        TabObj.IsDirty = false;
        Editor.setValue('');
        return;
    }

    if (TabObj.IsDirty) {
        if (!confirm(`Tab "${TabObj.Title}" has unsaved changes. Close anyway?`)) {
            return;
        }
    }
    
    TabObj.Element.classList.add('removing');
    
    setTimeout(() => {
        Tabs.splice(TabIndex, 1);
        TabObj.Element.remove();
        
        if (CurrentTab === TabId) {
            const NewIndex = Math.min(TabIndex, Tabs.length - 1);
            SwitchTab(Tabs[NewIndex].Id);
        }
    }, 200);
}

function SwitchTab(TabId) {
    const TabObj = Tabs.find(T => T.Id === TabId);
    if (!TabObj) return;

    if (CurrentTab && CurrentTab !== TabId) {
        const OldTab = Tabs.find(T => T.Id === CurrentTab);
        if (OldTab) {
            OldTab.Content = Editor.getValue();
        }
    }

    Tabs.forEach(T => {
        if (T.Element) {
            T.Element.classList.remove('active');
        }
    });

    if (TabObj.Element) {
        TabObj.Element.classList.add('active');
    }

    const ContentToSet = TabObj.Content || `print("Hello, World!")`;
    Editor.setValue(ContentToSet);
    
    CurrentTab = TabId;
    document.title = `Unix - ${TabObj.Title}`;
}

function UpdateTabTitle(TabObj, IsDirty = null) {
    if (!TabObj.Element) return;
    
    if (IsDirty !== null) {
        TabObj.IsDirty = IsDirty;
    }
    
    const TitleElement = TabObj.Element.querySelector('.tab-title');
    if (TitleElement && !TitleElement.classList.contains('editing')) {
        TitleElement.textContent = TabObj.Title + (TabObj.IsDirty ? ' •' : '');
    }
}

function SetupAutosave() {
    let SaveTimeout;
    let LastContent = '';
    
    Editor.onDidChangeModelContent(() => {
        clearTimeout(SaveTimeout);
        
        const CurrentContent = Editor.getValue();
        const HasChanges = CurrentContent !== LastContent;
        
        if (CurrentTab && HasChanges) {
            const TabObj = Tabs.find(T => T.Id === CurrentTab);
            if (TabObj) {
                UpdateTabTitle(TabObj, true);
            }
        }
        
        SaveTimeout = setTimeout(() => {
            if (CurrentTab) {
                const TabObj = Tabs.find(T => T.Id === CurrentTab);
                if (TabObj) {
                    TabObj.Content = CurrentContent;
                    LastContent = CurrentContent;
                }
            }
        }, 500);
    });
}

var EnableAntiSkid, DisableAntiSkid, SetText, ShowMinimap, HideMinimap;
var EnableAutoComplete, DisableAutoComplete, GetText, AddIntellisense, Refresh;

require.config({
    paths: {
        'vs': 'vs'
    }
});

require(['vs/editor/editor.main'], function () {
    function GetDependencyProposals() {
        return Proposals;
    }

    monaco.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems: function (Model, Position) {
            return GetDependencyProposals();
        },
        triggerCharacters: ['.', ':', '"'],
    });

    monaco.editor.defineTheme('unix-theme', {
        base: 'vs-dark',
        inherit: true,
        colors: {
            "editor.background": '#0D1117',
            "editor.foreground": '#F0F6FC',
            "editorLineNumber.foreground": '#6E7681',
            "editorLineNumber.activeForeground": '#8B949E',
            "editor.lineHighlightBackground": '#161B22',
            "editor.selectionBackground": '#2858A6FF',
            "editor.inactiveSelectionBackground": '#21262D',
            "editorCursor.foreground": '#58A6FF',
            "scrollbarSlider.background": '#8B949E80',
            "scrollbarSlider.hoverBackground": '#C9D1D9A0',
            "editorWidget.background": '#21262D',
            "editorWidget.border": '#30363D',
            "editorSuggestWidget.background": '#21262D',
            "editorSuggestWidget.border": '#58A6FF',
        },
        rules: [
            { token: 'comment', foreground: '8B949E', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'A855F7', fontStyle: 'bold' },
            { token: 'string', foreground: '56D364' },
            { token: 'number', foreground: 'FFA657' },
            { token: 'identifier', foreground: 'F0F6FC' },
            { token: 'global', foreground: '58A6FF', fontStyle: 'bold' },
            { token: 'method', foreground: 'FFA1DC' },
        ]
    });

    Editor = monaco.editor.create(document.getElementById('container'), {
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
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: 14,
        lineHeight: 22,
        padding: { top: 16, bottom: 16 },
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            useShadows: true,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
        },
        suggest: {
            snippetsPreventQuickSuggestions: false,
        }
    });

    AddTab('main.lua');
    SetupAutosave();

    EnableAutoComplete = function() {
        Editor.updateOptions({
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "smart",
            wordBasedSuggestions: "on"
        });
    };

    DisableAutoComplete = function() {
        Editor.updateOptions({
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: "off",
            wordBasedSuggestions: "off"
        });
    };

    ShowMinimap = function() {
        Editor.updateOptions({ minimap: { enabled: true } });
    };

    HideMinimap = function() {
        Editor.updateOptions({ minimap: { enabled: false } });
    };

    function HandleOver() {
        document.body.style.filter = "blur(0px)";
    }
    
    function HandleLeave() {
        document.body.style.filter = "blur(3px)";
    }
    
    EnableAntiSkid = function() {
        document.body.style.filter = "blur(3px)";
        document.body.addEventListener("mouseover", HandleOver);
        document.body.addEventListener("mouseleave", HandleLeave);
    };
    
    DisableAntiSkid = function() {
        document.body.style.filter = "blur(0px)";
        document.body.removeEventListener("mouseover", HandleOver, false);
        document.body.removeEventListener("mouseleave", HandleLeave, false);
    };

    GetText = function() {
        return Editor.getValue();
    };

    SetText = function(Text) {
        Editor.setValue(Text || '');
        if (CurrentTab) {
            const TabObj = Tabs.find(T => T.Id === CurrentTab);
            if (TabObj) {
                TabObj.Content = Text || '';
                UpdateTabTitle(TabObj, false);
            }
        }
    };

    AddIntellisense = function(Label, Kind, Detail, InsertText) {
        let CompletionKind;
        switch (Kind) {
            case "Class": CompletionKind = monaco.languages.CompletionItemKind.Class; break;
            case "Color": CompletionKind = monaco.languages.CompletionItemKind.Color; break;
            case "Constructor": CompletionKind = monaco.languages.CompletionItemKind.Constructor; break;
            case "Enum": CompletionKind = monaco.languages.CompletionItemKind.Enum; break;
            case "Field": CompletionKind = monaco.languages.CompletionItemKind.Field; break;
            case "File": CompletionKind = monaco.languages.CompletionItemKind.File; break;
            case "Folder": CompletionKind = monaco.languages.CompletionItemKind.Folder; break;
            case "Function": CompletionKind = monaco.languages.CompletionItemKind.Function; break;
            case "Interface": CompletionKind = monaco.languages.CompletionItemKind.Interface; break;
            case "Keyword": CompletionKind = monaco.languages.CompletionItemKind.Keyword; break;
            case "Method": CompletionKind = monaco.languages.CompletionItemKind.Method; break;
            case "Module": CompletionKind = monaco.languages.CompletionItemKind.Module; break;
            case "Property": CompletionKind = monaco.languages.CompletionItemKind.Property; break;
            case "Reference": CompletionKind = monaco.languages.CompletionItemKind.Reference; break;
            case "Snippet": CompletionKind = monaco.languages.CompletionItemKind.Snippet; break;
            case "Text": CompletionKind = monaco.languages.CompletionItemKind.Text; break;
            case "Unit": CompletionKind = monaco.languages.CompletionItemKind.Unit; break;
            case "Value": CompletionKind = monaco.languages.CompletionItemKind.Value; break;
            case "Variable": CompletionKind = monaco.languages.CompletionItemKind.Variable; break;
            default: CompletionKind = monaco.languages.CompletionItemKind.Text; break;
        }

        Proposals.push({
            label: Label,
            kind: CompletionKind,
            detail: Detail,
            insertText: InsertText || Label,
            documentation: Detail
        });
    };

    Refresh = function() {
        const Text = GetText();
        SetText("");
        Editor.trigger('keyboard', 'type', { text: Text });
    };

    window.addEventListener('resize', function() {
        Editor.layout();
    });

    async function LoadIntellisenseData() {
        try {
            const Response = await fetch('https://raw.githubusercontent.com/iceycold3/monaco/refs/heads/main/lib.json');
            const Docs = await Response.json();

            for (const Prop in Docs) {
                for (const Item in Docs[Prop]) {
                    const Document = Docs[Prop][Item];
                    AddIntellisense(Document.label, Document.type, Document.description, Document.insert);
                }
            }

            const LuaKeywords = ["_G", "_VERSION", "Enum", "game", "plugin", "shared", "script", "workspace", 
                                "DebuggerManager", "elapsedTime", "LoadLibrary", "PluginManager", "settings", 
                                "tick", "time", "typeof", "UserSettings"];
            LuaKeywords.forEach(Keyword => AddIntellisense(Keyword, "Keyword", Keyword, Keyword));

            const LuaControlFlow = ["and", "break", "do", "else", "elseif", "end", "false", "for", "function", 
                                   "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", 
                                   "until", "while"];
            LuaControlFlow.forEach(Keyword => AddIntellisense(Keyword, "Variable", Keyword, Keyword));

            const LuaMethods = ["math.abs", "math.acos", "math.asin", "math.atan", "math.atan2", "math.ceil", 
                               "math.cos", "math.cosh", "math.deg", "math.exp", "math.floor", "math.fmod", 
                               "math.frexp", "math.huge", "math.ldexp", "math.log", "math.max", "math.min", 
                               "math.modf", "math.pi", "math.pow", "math.rad", "math.random", "math.randomseed", 
                               "math.sin", "math.sinh", "math.sqrt", "math.tan", "math.tanh", "table.concat", 
                               "table.foreach", "table.foreachi", "table.sort", "table.insert", "table.remove"];
            LuaMethods.forEach(Method => AddIntellisense(Method, "Method", Method, Method));

            const LuaClasses = ["Drawing", "debug", "Instance", "Color3", "Vector3", "Vector2", "BrickColor", 
                               "math", "table", "string", "coroutine", "Humanoid", "ClickDetector", "LocalScript", 
                               "Model", "ModuleScript", "Mouse", "Part", "Player", "Script", "Tool", "RunService", 
                               "UserInputService", "Workspace"];
            LuaClasses.forEach(Cls => AddIntellisense(Cls, "Class", Cls, Cls));

            const LuaFunctions = ["print", "warn", "wait", "info", "printidentity", "assert", "collectgarbage", 
                                 "error", "getfenv", "getmetatable", "setmetatable", "ipairs", "loadfile", 
                                 "loadstring", "newproxy", "next", "pairs", "pcall", "spawn", "rawequal", 
                                 "rawget", "rawset", "select", "tonumber", "tostring", "type", "unpack", "xpcall", 
                                 "delay", "stats"];
            LuaFunctions.forEach(Func => AddIntellisense(Func, "Function", Func, Func));

        } catch (Error) {
            console.warn('Failed to load intellisense data:', Error);
        }
    }

    LoadIntellisenseData();

    Editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() {
        if (CurrentTab) {
            const TabObj = Tabs.find(T => T.Id === CurrentTab);
            if (TabObj) {
                UpdateTabTitle(TabObj, false);
            }
        }
    });

    Editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, function() {
        const TabCount = Tabs.length + 1;
        AddTab(`script${TabCount}.lua`);
    });

    Editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, function() {
        if (CurrentTab) {
            RemoveTab(CurrentTab);
        }
    });

    let TabSwitchIndex = 0;
    Editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Tab, function() {
        if (Tabs.length > 1) {
            TabSwitchIndex = (TabSwitchIndex + 1) % Tabs.length;
            SwitchTab(Tabs[TabSwitchIndex].Id);
        }
    });

    console.log('Unix Editor initialized successfully');
});