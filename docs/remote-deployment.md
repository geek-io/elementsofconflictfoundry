# Remote deployment

Upload the extracted `elementsofconflictfoundry` runtime folder to the destination server's configured `Data/systems/` directory. Use credentials provided for the deployment session; never store credentials in the repository or release archive.

Stop Foundry before replacing the system. Preserve the previous system folder, verify the archive checksum, and replace the folder so obsolete compendiums do not remain. Ensure the Foundry service account can read the files and write to its data directory. Start Foundry using that server's service manager and verify the installed system version.

Server addresses, accounts, and restart commands belong in private deployment configuration.
