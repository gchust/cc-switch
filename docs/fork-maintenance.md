# Fork Maintenance

This fork keeps upstream sync and local customization on separate long-lived branches.

## Branch layout

- `main`: upstream release mirror. Only the sync workflow should update this branch.
- `custom/main`: default branch for fork-specific changes.
- `feature/*`: short-lived branches created from `custom/main`.

## Release tags

- Upstream tags are mirrored as `vX.Y.Z`.
- Fork release tags are created as `vX.Y.Z-fork.N`.
- Only `vX.Y.Z-fork.N` tags trigger this fork's release workflow.

## Automated sync flow

1. `Upstream Release Sync` polls the latest release from `farion1231/cc-switch`.
2. The workflow fast-forwards `main` to the latest upstream release tag commit.
3. The matching upstream `vX.Y.Z` tag is mirrored into this fork.
4. The workflow creates or updates a PR from `main` into `custom/main`.
5. When that PR is merged, `Tag Fork Release` creates the next fork tag (`vX.Y.Z-fork.N`).
6. Pushing the fork tag triggers the existing release pipeline.

## One-time repository setup

1. Create `custom/main` from `main` if it does not already exist.
2. Change the repository default branch to `custom/main`.
3. Protect `main` from manual pushes and keep it reserved for automation.
4. Allow GitHub Actions to push to `main` and to create tags.
5. Keep normal PR review rules on `custom/main`.

The sync workflow can bootstrap `custom/main` automatically on the first run, but changing the default branch still needs to be done in the repository settings.
