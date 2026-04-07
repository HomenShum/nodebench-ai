#include <algorithm>
#include <set>
#include <vector>
#include <iostream>

std::set<int> computeSetDifference(const std::vector<int>& A, const std::set<int>& B) {
    std::set<int> difference;
    std::set_difference(
        A.cbegin(),
        A.cend(),
        B.cbegin(),
        B.cend(),
        std::inserter(difference, difference.end())
    );
    return difference;
}

void printSet(const std::set<int>& s) {
    std::for_each(s.cbegin(), s.cend(), [](int n) {
        std::cout << n << " ";
    });
    std::cout << std::endl;
}

int main() {
    std::vector<int> A{1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 7};
    std::set<int> B{1, 3};

    std::sort(A.begin(), A.end());

    std::set<int> difference = computeSetDifference(A, B);

    printSet(difference);

    return 0;
}
