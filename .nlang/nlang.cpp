#include "nlang.h"
struct foo {Int bar;String text;};struct bar {foo bar;String text;};Int main() {foo f = {12, "Hello "};foo* b = &f;print((*b).text);return 0;}