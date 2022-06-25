{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
  };

  outputs = {self, nixpkgs}:
    let pkgs = nixpkgs.legacyPackages.x86_64-linux;
        npkgs = pkgs.nodePackages;
    in {
      defaultPackage.x86_64-linux = pkgs.hello;

      devShell.x86_64-linux =
        pkgs.mkShell {
          buildInputs = [

            pkgs.nodejs
            pkgs.libjpeg
            pkgs.giflib
            pkgs.libpng
            pkgs.cairo
            pkgs.pango
            pkgs.harfbuzz

            npkgs.typescript
            npkgs.node-gyp
            npkgs.serve

          ];
        };

        APPEND_LIBRARY_PATH = "${pkgs.lib.makeLibraryPath [ pkgs.libuuid ]}:${pkgs.lib.makeLibraryPath [ pkgs.libjpeg ]}";
        shellHook = ''
          export LD_LIBRARY_PATH="$APPEND_LIBRARY_PATH:$LD_LIBRARY_PATH"
        '';
    };

}
