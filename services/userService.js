const users = [];

export const createUser = (name, email, password) => {
  const user = { name, email, password };
  users.push(user);
  return user;
};

export const loginUser = (email, password) => {
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    throw new Error('Invalid email or password');
  }
  return user;
};