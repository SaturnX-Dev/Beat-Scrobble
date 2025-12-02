// unused
package romanizer

import (
	"regexp"
	"strings"

	"github.com/gosimple/unidecode"
)

// regex to match only Latin letters, numbers, basic punctuation and spaces
var latinCharset = regexp.MustCompile(`^[\p{Latin}\p{P}\p{N}\p{Zs}]+$`)

// Romanize returns a romanized version of the input string if it contains non-Latin characters.
// If the input is already in Latin script, it returns an empty string.
func Romanize(input string) string {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return ""
	}

	if latinCharset.MatchString(trimmed) {
		return ""
	}

	return strings.TrimSpace(unidecode.Unidecode(trimmed))
}
