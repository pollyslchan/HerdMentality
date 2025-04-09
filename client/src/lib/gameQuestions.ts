// This file contains a set of predefined questions for the game

export const gameQuestions = [
  "Name a food that most people dislike as a child.",
  "Name something people do to prepare for a job interview.",
  "Name a common excuse for being late.",
  "Name a place people go to take photos.",
  "Name something people do while waiting in a long line.",
  "Name a movie that makes everyone cry.",
  "Name something people forget to pack when traveling.",
  "Name a common phobia.",
  "Name a common New Year's resolution.",
  "Name an item people keep in their car at all times.",
  "Name a job where you have to wear a uniform.",
  "Name something that gets harder as you get older.",
  "Name a musical instrument that's difficult to play.",
  "Name something you'd find in a hospital.",
  "Name a popular tourist destination.",
  "Name something people collect as a hobby.",
  "Name a holiday tradition.",
  "Name a common household chore people hate doing.",
  "Name something people typically do before bed.",
  "Name a famous landmark."
];

export function getRandomQuestions(count: number): string[] {
  const shuffled = [...gameQuestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
