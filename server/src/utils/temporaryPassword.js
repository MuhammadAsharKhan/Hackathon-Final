import crypto from "crypto";

const LETTERS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const PASSWORD_LENGTH = 10;

const pick = (alphabet) => alphabet[crypto.randomInt(0, alphabet.length)];

const shuffle = (characters) => {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }
  return characters;
};

// Ten characters with at least one letter and one digit, so a new account can
// be handed a password that passes the same rules as a user-chosen one.
export const createTemporaryPassword = () => {
  const characters = [pick(LETTERS), pick(DIGITS)];

  while (characters.length < PASSWORD_LENGTH) {
    characters.push(pick(LETTERS + DIGITS));
  }

  return shuffle(characters).join("");
};
