; L'installer. Inno Setup, perché fa quel che serve — copia una cartella,
; mette la voce nel menu Start, scrive il disinstallatore — e non chiede di
; imparare un formato per farlo.
;
; Si installa per l'utente, non per la macchina: niente UAC, niente password
; d'amministratore. L'app non tocca niente fuori dalla sua cartella e dal suo
; archivio in %LOCALAPPDATA%, quindi i diritti in più sarebbero solo una
; finestra gialla in più da leggere.
;
;   iscc /DVersione=1.2.3 win\quaderno.iss

#ifndef Versione
  #define Versione "1.0.0"
#endif

#define Nome "Il Quaderno degli Appunti"
#define Exe "Quaderno.exe"

[Setup]
AppId={{9C1B7E14-3A5D-4C88-9A2E-1F6B0D73A4C2}
AppName={#Nome}
AppVersion={#Versione}
AppVerName={#Nome} {#Versione}
AppPublisher=Simone Riva
AppPublisherURL=https://github.com/simiriva95/quaderno
DefaultDirName={autopf}\Quaderno
DefaultGroupName=Quaderno
DisableProgramGroupPage=yes
DisableDirPage=auto
PrivilegesRequired=lowest
OutputDir=build
OutputBaseFilename=Quaderno-{#Versione}-setup
SetupIconFile=quaderno.ico
UninstallDisplayIcon={app}\{#Exe}
UninstallDisplayName={#Nome}
WizardStyle=modern
Compression=lzma2/max
SolidCompression=yes
; Un aggiornamento con il quaderno aperto sovrascriverebbe un file in uso:
; meglio chiederglielo e richiuderlo, che lasciare l'installazione a metà.
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"

[Tasks]
Name: "desktopicon"; Description: "Metti l'icona sulla scrivania"; GroupDescription: "Altro:"; Flags: unchecked
Name: "avvio"; Description: "Tienilo nella barra a ogni accesso"; GroupDescription: "Altro:"; Flags: unchecked

[Files]
Source: "build\app\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#Nome}"; Filename: "{app}\{#Exe}"
Name: "{autodesktop}\{#Nome}"; Filename: "{app}\{#Exe}"; Tasks: desktopicon
Name: "{userstartup}\{#Nome}"; Filename: "{app}\{#Exe}"; Tasks: avvio

[Run]
Filename: "{app}\{#Exe}"; Description: "Apri il Quaderno"; Flags: nowait postinstall skipifsilent
