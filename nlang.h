#ifndef NLANG_H
#define NLANG_H

#include <iostream>
#include <string>

typedef std::string String;
typedef int Int;
typedef float Float;
typedef bool Bool;
typedef void Void;

void print() {
    std::cout << std::endl;
}

template <typename First, typename... Strings>
void print(First arg, const Strings&... rest) {
    std::cout << arg << " ";
    print(rest...);
}

String input() {
    String input;
    getline(std::cin, input);
    return input;
}

String

#endif