// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
/**
 * Allows for the usage of template strings inside from a file
 */
export function stringTemplate(
  template: string,
  variables: { [key: string]: string | number }
): string {
  let temporary = template

  for (const variable in variables) {
    // Replace only replaces the first instance of a string. We want to
    // replace all instances
    while (temporary.includes(`\${${variable}}`)) {
      temporary = temporary.replace(
        `\${${variable}}`,
        variables[variable].toString()
      )
    }
  }

  return temporary
}
