#ifndef NLANG_H
#define NLANG_H

#include <iostream>
#include <string>

typedef std::string String;
typedef int Int;
typedef float Float;
typedef bool Bool;
typedef void Void;

void __nlang__print() {
    std::cout << std::endl;
}

template <typename First, typename... Strings>
void __nlang__print(First arg, const Strings&... rest) {
    std::cout << arg << " ";
    __nlang__print(rest...);
}

String __nlang__input() {
    String input;
    getline(std::cin, input);
    return input;
}

#endif