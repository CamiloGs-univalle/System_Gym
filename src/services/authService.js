import { users } from "../mock/users";

export const authService = {

    login(username, password) {

        const user = users.find(
            user =>
                user.username === username &&
                user.password === password
        );

        return user || null;
    }

};