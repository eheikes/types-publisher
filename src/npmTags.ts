import * as yargs from "yargs";

import { AnyPackage, AllPackages, TypeScriptVersion } from "./lib/packages";
import NpmClient from "./lib/npm-client";
import Versions from "./lib/versions";

import { Logger } from "./util/logging";
import { done } from "./util/util";

if (!module.parent) {
	const dry = !!yargs.argv.dry;
	done(tagAll(dry));
}

/**
 * Refreshes the tags on every package.
 * This shouldn't normally need to run, since we run `tagSingle` whenever we publish a package.
 * But this should be run if the way we calculate tags changes (e.g. when a new release is allowed to be tagged "latest").
 */
async function tagAll(dry: boolean) {
	const versions = await Versions.load();
	const client = await NpmClient.create();

	for (const pkg of await AllPackages.readTypings()) {
		// Only update tags for the latest version of the package.
		if (pkg.isLatest) {
			const version = versions.getVersion(pkg.id).versionString;
			await addNpmTagsForPackage(pkg, version, client, console.log, dry);
		}
	}

	// Don't tag notNeeded packages
}

export async function addNpmTagsForPackage(pkg: AnyPackage, version: string, client: NpmClient, log: Logger, dry: boolean): Promise<void> {
	const tags = TypeScriptVersion.tagsToUpdate(pkg.isNotNeeded() ? "2.0" : pkg.typeScriptVersion);
	log(`Tag ${pkg.fullNpmName}@${version} as ${JSON.stringify(tags)}`);
	if (!dry) {
		for (const tag of tags) {
			await client.tag(pkg.fullEscapedNpmName, version, tag);
		}
	}
}
