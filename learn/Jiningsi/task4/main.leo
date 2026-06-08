program age_verification.aleo {

    struct User {
        id: u64,
        age: u64,
        verified: bool,
    }

    mapping users: u64 => User;

    // 注册用户（隐私输入年龄）
    function register(
        id: u64,
        age: u64,
    ) {
        let user: User = User {
            id: id,
            age: age,
            verified: false,
        };
        Mapping::set(users, id, user);
    }

    // 零知识验证：是否年满18岁（不泄露具体年龄）
    function verify_age(
        id: u64,
    ) -> bool {
        let user: User = Mapping::get(users, id);
        let is_adult: bool = user.age >= 18u64;
        user.verified = is_adult;
        Mapping::set(users, id, user);
        return is_adult;
    }

    // 获取验证结果（只返回是/否，不返回年龄）
    function get_verification(
        id: u64,
    ) -> bool {
        let user: User = Mapping::get(users, id);
        return user.verified;
    }
}