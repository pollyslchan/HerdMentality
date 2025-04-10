import { 
  users, type User, type InsertUser,
  games, type Game, type InsertGame,
  players, type Player, type InsertPlayer,
  questions, type Question, type InsertQuestion,
  rounds, type Round, type InsertRound,
  answers, type Answer, type InsertAnswer,
  type GameWithDetails, type PlayerWithAnswer, type RoundWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, asc } from "drizzle-orm";

// Storage interface
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getGameByCode(code: string): Promise<Game | undefined>;
  getAllGames(): Promise<Game[]>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined>;
  getGameWithDetails(id: number): Promise<GameWithDetails | undefined>;
  
  // Player operations
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayer(id: number): Promise<Player | undefined>;
  updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined>;
  getPlayersByGame(gameId: number): Promise<Player[]>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestion(id: number): Promise<Question | undefined>;
  getAllQuestions(): Promise<Question[]>;
  getRandomQuestions(count: number): Promise<Question[]>;
  
  // Round operations
  createRound(round: InsertRound): Promise<Round>;
  getRound(id: number): Promise<Round | undefined>;
  updateRound(id: number, updates: Partial<Round>): Promise<Round | undefined>;
  getRoundsByGame(gameId: number): Promise<Round[]>;
  getCurrentRound(gameId: number): Promise<Round | undefined>;
  getRoundWithDetails(id: number): Promise<RoundWithDetails | undefined>;
  
  // Answer operations
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  getAnswer(id: number): Promise<Answer | undefined>;
  getAnswersByRound(roundId: number): Promise<Answer[]>;
  getAnswerByRoundAndPlayer(roundId: number, playerId: number): Promise<Answer | undefined>;
  updateAnswer(id: number, updates: Partial<Answer>): Promise<Answer | undefined>;
  processRoundAnswers(roundId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private games: Map<number, Game>;
  private players: Map<number, Player>;
  private questions: Map<number, Question>;
  private rounds: Map<number, Round>;
  private answers: Map<number, Answer>;
  
  // Auto-increment IDs
  private userId: number;
  private gameId: number;
  private playerId: number;
  private questionId: number;
  private roundId: number;
  private answerId: number;
  
  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.players = new Map();
    this.questions = new Map();
    this.rounds = new Map();
    this.answers = new Map();
    
    this.userId = 1;
    this.gameId = 1;
    this.playerId = 1;
    this.questionId = 1;
    this.roundId = 1;
    this.answerId = 1;
    
    // Initialize with standard questions
    this.initializeQuestions();
  }
  
  // Initialize with a set of standard questions
  private initializeQuestions() {
    const standardQuestions = [
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
    
    standardQuestions.forEach(questionText => {
      this.createQuestion({ text: questionText });
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Game methods
  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.gameId++;
    const game: Game = { 
      ...insertGame,
      id, 
      currentRound: 1,
      isComplete: false,
      createdAt: new Date(),
      gameCode: insertGame.gameCode || ""
    };
    this.games.set(id, game);
    return game;
  }
  
  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }
  
  async getGameByCode(code: string): Promise<Game | undefined> {
    return Array.from(this.games.values()).find(
      (game) => game.gameCode === code
    );
  }
  
  async getAllGames(): Promise<Game[]> {
    return Array.from(this.games.values());
  }
  
  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const updatedGame = { ...game, ...updates };
    this.games.set(id, updatedGame);
    return updatedGame;
  }
  
  async getGameWithDetails(id: number): Promise<GameWithDetails | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const players = await this.getPlayersByGame(id);
    const rounds = await this.getRoundsByGame(id);
    
    const roundsWithDetails: RoundWithDetails[] = [];
    
    for (const round of rounds) {
      const question = await this.getQuestion(round.questionId);
      const answers = await this.getAnswersByRound(round.id);
      
      if (question) {
        roundsWithDetails.push({
          ...round,
          question,
          answers
        });
      }
    }
    
    const playersWithAnswers: PlayerWithAnswer[] = [];
    
    for (const player of players) {
      const currentRound = rounds.find(r => r.roundNumber === game.currentRound);
      let answer: Answer | undefined;
      
      if (currentRound) {
        answer = await this.getAnswerByRoundAndPlayer(currentRound.id, player.id);
      }
      
      playersWithAnswers.push({
        ...player,
        answer: answer?.text,
        hasSubmitted: !!answer,
        isCommon: answer?.isCommon,
        isBlackSheep: answer?.isBlackSheep
      });
    }
    
    // Get current question
    let currentQuestion: Question | undefined;
    const currentRound = rounds.find(r => r.roundNumber === game.currentRound);
    if (currentRound) {
      currentQuestion = await this.getQuestion(currentRound.questionId);
    }
    
    return {
      ...game,
      players: playersWithAnswers,
      rounds: roundsWithDetails,
      currentQuestion
    };
  }
  
  // Player methods
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = this.playerId++;
    const player: Player = { 
      ...insertPlayer,
      id,
      score: 0
    };
    this.players.set(id, player);
    return player;
  }
  
  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }
  
  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updatedPlayer = { ...player, ...updates };
    this.players.set(id, updatedPlayer);
    return updatedPlayer;
  }
  
  async getPlayersByGame(gameId: number): Promise<Player[]> {
    return Array.from(this.players.values())
      .filter(player => player.gameId === gameId)
      .sort((a, b) => a.order - b.order);
  }
  
  // Question methods
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.questionId++;
    const question: Question = { ...insertQuestion, id };
    this.questions.set(id, question);
    return question;
  }
  
  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  
  async getAllQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }
  
  async getRandomQuestions(count: number): Promise<Question[]> {
    const allQuestions = Array.from(this.questions.values());
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  // Round methods
  async createRound(insertRound: InsertRound): Promise<Round> {
    const id = this.roundId++;
    const round: Round = { 
      ...insertRound,
      id,
      isComplete: false
    };
    this.rounds.set(id, round);
    return round;
  }
  
  async getRound(id: number): Promise<Round | undefined> {
    return this.rounds.get(id);
  }
  
  async updateRound(id: number, updates: Partial<Round>): Promise<Round | undefined> {
    const round = this.rounds.get(id);
    if (!round) return undefined;
    
    const updatedRound = { ...round, ...updates };
    this.rounds.set(id, updatedRound);
    return updatedRound;
  }
  
  async getRoundsByGame(gameId: number): Promise<Round[]> {
    return Array.from(this.rounds.values())
      .filter(round => round.gameId === gameId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }
  
  async getCurrentRound(gameId: number): Promise<Round | undefined> {
    const game = await this.getGame(gameId);
    if (!game) return undefined;
    
    return Array.from(this.rounds.values())
      .find(round => round.gameId === gameId && round.roundNumber === game.currentRound);
  }
  
  async getRoundWithDetails(id: number): Promise<RoundWithDetails | undefined> {
    const round = this.rounds.get(id);
    if (!round) return undefined;
    
    const question = await this.getQuestion(round.questionId);
    if (!question) return undefined;
    
    const answers = await this.getAnswersByRound(id);
    
    return {
      ...round,
      question,
      answers
    };
  }
  
  // Answer methods
  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const id = this.answerId++;
    const answer: Answer = { 
      ...insertAnswer,
      id,
      isCommon: false,
      isBlackSheep: false
    };
    this.answers.set(id, answer);
    return answer;
  }
  
  async getAnswer(id: number): Promise<Answer | undefined> {
    return this.answers.get(id);
  }
  
  async getAnswersByRound(roundId: number): Promise<Answer[]> {
    return Array.from(this.answers.values())
      .filter(answer => answer.roundId === roundId);
  }
  
  async getAnswerByRoundAndPlayer(roundId: number, playerId: number): Promise<Answer | undefined> {
    return Array.from(this.answers.values())
      .find(answer => answer.roundId === roundId && answer.playerId === playerId);
  }
  
  async updateAnswer(id: number, updates: Partial<Answer>): Promise<Answer | undefined> {
    const answer = this.answers.get(id);
    if (!answer) return undefined;
    
    const updatedAnswer = { ...answer, ...updates };
    this.answers.set(id, updatedAnswer);
    return updatedAnswer;
  }
  
  // Process round answers to determine common answers and black sheep
  async processRoundAnswers(roundId: number): Promise<void> {
    const answers = await this.getAnswersByRound(roundId);
    if (answers.length === 0) return;
    
    // Group answers by text (case insensitive)
    const answerGroups: Record<string, Answer[]> = {};
    
    for (const answer of answers) {
      const normalizedText = answer.text.toLowerCase().trim();
      if (!answerGroups[normalizedText]) {
        answerGroups[normalizedText] = [];
      }
      answerGroups[normalizedText].push(answer);
    }
    
    // Find the most common answer(s)
    let maxCount = 0;
    let commonAnswerKeys: string[] = [];
    
    for (const key in answerGroups) {
      const count = answerGroups[key].length;
      
      if (count > maxCount) {
        maxCount = count;
        commonAnswerKeys = [key];
      } else if (count === maxCount) {
        commonAnswerKeys.push(key);
      }
    }
    
    // Mark common answers
    for (const key of commonAnswerKeys) {
      for (const answer of answerGroups[key]) {
        await this.updateAnswer(answer.id, { isCommon: true });
      }
    }
    
    // Find the least common answer (black sheep)
    let minCount = answers.length + 1;
    let blackSheepKeys: string[] = [];
    
    for (const key in answerGroups) {
      const count = answerGroups[key].length;
      
      if (count < minCount) {
        minCount = count;
        blackSheepKeys = [key];
      } else if (count === minCount) {
        blackSheepKeys.push(key);
      }
    }
    
    // If there's only one least common answer, mark it as black sheep
    if (blackSheepKeys.length === 1) {
      for (const answer of answerGroups[blackSheepKeys[0]]) {
        await this.updateAnswer(answer.id, { isBlackSheep: true });
      }
    }
    
    // Update player scores
    const round = await this.getRound(roundId);
    if (!round) return;
    
    // Get all players for this game
    const players = await this.getPlayersByGame(round.gameId);
    
    for (const player of players) {
      const playerAnswer = await this.getAnswerByRoundAndPlayer(roundId, player.id);
      if (!playerAnswer) continue;
      
      let scoreChange = 0;
      
      // Award points for common answers
      if (playerAnswer.isCommon) {
        scoreChange += 1;
      }
      
      // Deduct points for black sheep
      if (playerAnswer.isBlackSheep) {
        scoreChange -= 1;
      }
      
      // Update player score
      if (scoreChange !== 0) {
        const newScore = player.score + scoreChange;
        await this.updatePlayer(player.id, { score: newScore });
      }
    }
    
    // Mark round as complete
    await this.updateRound(roundId, { isComplete: true });
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Game methods
  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values({
      ...insertGame,
      currentRound: 1,
      isComplete: false,
      gameCode: insertGame.gameCode || "",
    }).returning();
    
    return game;
  }
  
  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }
  
  async getGameByCode(code: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.gameCode, code));
    return game;
  }
  
  async getAllGames(): Promise<Game[]> {
    return await db.select().from(games);
  }
  
  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const [game] = await db
      .update(games)
      .set(updates)
      .where(eq(games.id, id))
      .returning();
    
    return game;
  }
  
  async getGameWithDetails(id: number): Promise<GameWithDetails | undefined> {
    const game = await this.getGame(id);
    if (!game) return undefined;
    
    const gamePlayers = await this.getPlayersByGame(id);
    const gameRounds = await this.getRoundsByGame(id);
    
    const roundsWithDetails: RoundWithDetails[] = [];
    
    for (const round of gameRounds) {
      const question = await this.getQuestion(round.questionId);
      const roundAnswers = await this.getAnswersByRound(round.id);
      
      if (question) {
        roundsWithDetails.push({
          ...round,
          question,
          answers: roundAnswers
        });
      }
    }
    
    const playersWithAnswers: PlayerWithAnswer[] = [];
    
    for (const player of gamePlayers) {
      const currentRound = gameRounds.find(r => r.roundNumber === game.currentRound);
      let answer: Answer | undefined;
      
      if (currentRound) {
        answer = await this.getAnswerByRoundAndPlayer(currentRound.id, player.id);
      }
      
      playersWithAnswers.push({
        ...player,
        answer: answer?.text,
        hasSubmitted: !!answer,
        isCommon: answer?.isCommon,
        isBlackSheep: answer?.isBlackSheep
      });
    }
    
    // Get current question
    let currentQuestion: Question | undefined;
    const currentRound = gameRounds.find(r => r.roundNumber === game.currentRound);
    if (currentRound) {
      currentQuestion = await this.getQuestion(currentRound.questionId);
    }
    
    return {
      ...game,
      players: playersWithAnswers,
      rounds: roundsWithDetails,
      currentQuestion
    };
  }
  
  // Player methods
  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values({
      ...insertPlayer,
      score: 0
    }).returning();
    
    return player;
  }
  
  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }
  
  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player | undefined> {
    const [player] = await db
      .update(players)
      .set(updates)
      .where(eq(players.id, id))
      .returning();
    
    return player;
  }
  
  async getPlayersByGame(gameId: number): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(eq(players.gameId, gameId))
      .orderBy(asc(players.order));
  }
  
  // Question methods
  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(insertQuestion).returning();
    return question;
  }
  
  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }
  
  async getAllQuestions(): Promise<Question[]> {
    return await db.select().from(questions);
  }
  
  async getRandomQuestions(count: number): Promise<Question[]> {
    // Use SQL random() function to get random questions
    return await db.select().from(questions).orderBy(sql`random()`).limit(count);
  }
  
  // Round methods
  async createRound(insertRound: InsertRound): Promise<Round> {
    const [round] = await db.insert(rounds).values({
      ...insertRound,
      isComplete: false
    }).returning();
    
    return round;
  }
  
  async getRound(id: number): Promise<Round | undefined> {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
    return round;
  }
  
  async updateRound(id: number, updates: Partial<Round>): Promise<Round | undefined> {
    const [round] = await db
      .update(rounds)
      .set(updates)
      .where(eq(rounds.id, id))
      .returning();
    
    return round;
  }
  
  async getRoundsByGame(gameId: number): Promise<Round[]> {
    return await db
      .select()
      .from(rounds)
      .where(eq(rounds.gameId, gameId))
      .orderBy(asc(rounds.roundNumber));
  }
  
  async getCurrentRound(gameId: number): Promise<Round | undefined> {
    const game = await this.getGame(gameId);
    if (!game) return undefined;
    
    const [round] = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.gameId, gameId),
          eq(rounds.roundNumber, game.currentRound)
        )
      );
    
    return round;
  }
  
  async getRoundWithDetails(id: number): Promise<RoundWithDetails | undefined> {
    const round = await this.getRound(id);
    if (!round) return undefined;
    
    const question = await this.getQuestion(round.questionId);
    if (!question) return undefined;
    
    const roundAnswers = await this.getAnswersByRound(id);
    
    return {
      ...round,
      question,
      answers: roundAnswers
    };
  }
  
  // Answer methods
  async createAnswer(insertAnswer: InsertAnswer): Promise<Answer> {
    const [answer] = await db.insert(answers).values({
      ...insertAnswer,
      isCommon: false,
      isBlackSheep: false
    }).returning();
    
    return answer;
  }
  
  async getAnswer(id: number): Promise<Answer | undefined> {
    const [answer] = await db.select().from(answers).where(eq(answers.id, id));
    return answer;
  }
  
  async getAnswersByRound(roundId: number): Promise<Answer[]> {
    return await db
      .select()
      .from(answers)
      .where(eq(answers.roundId, roundId));
  }
  
  async getAnswerByRoundAndPlayer(roundId: number, playerId: number): Promise<Answer | undefined> {
    const [answer] = await db
      .select()
      .from(answers)
      .where(
        and(
          eq(answers.roundId, roundId),
          eq(answers.playerId, playerId)
        )
      );
    
    return answer;
  }
  
  async updateAnswer(id: number, updates: Partial<Answer>): Promise<Answer | undefined> {
    const [answer] = await db
      .update(answers)
      .set(updates)
      .where(eq(answers.id, id))
      .returning();
    
    return answer;
  }
  
  // Process round answers to determine common answers and black sheep
  async processRoundAnswers(roundId: number): Promise<void> {
    const roundAnswers = await this.getAnswersByRound(roundId);
    if (roundAnswers.length === 0) return;
    
    // Group answers by text (case insensitive)
    const answerGroups: Record<string, Answer[]> = {};
    
    for (const answer of roundAnswers) {
      const normalizedText = answer.text.toLowerCase().trim();
      if (!answerGroups[normalizedText]) {
        answerGroups[normalizedText] = [];
      }
      answerGroups[normalizedText].push(answer);
    }
    
    // Find the most common answer(s)
    let maxCount = 0;
    let commonAnswerKeys: string[] = [];
    
    for (const key in answerGroups) {
      const count = answerGroups[key].length;
      
      if (count > maxCount) {
        maxCount = count;
        commonAnswerKeys = [key];
      } else if (count === maxCount) {
        commonAnswerKeys.push(key);
      }
    }
    
    // Mark common answers
    for (const key of commonAnswerKeys) {
      for (const answer of answerGroups[key]) {
        await this.updateAnswer(answer.id, { isCommon: true });
      }
    }
    
    // Find the least common answer (black sheep)
    let minCount = roundAnswers.length + 1;
    let blackSheepKeys: string[] = [];
    
    for (const key in answerGroups) {
      const count = answerGroups[key].length;
      
      if (count < minCount) {
        minCount = count;
        blackSheepKeys = [key];
      } else if (count === minCount) {
        blackSheepKeys.push(key);
      }
    }
    
    // If there's only one least common answer, mark it as black sheep
    if (blackSheepKeys.length === 1) {
      for (const answer of answerGroups[blackSheepKeys[0]]) {
        await this.updateAnswer(answer.id, { isBlackSheep: true });
      }
    }
    
    // Update player scores
    const round = await this.getRound(roundId);
    if (!round) return;
    
    // Get all players for this game
    const gamePlayers = await this.getPlayersByGame(round.gameId);
    
    for (const player of gamePlayers) {
      const playerAnswer = await this.getAnswerByRoundAndPlayer(roundId, player.id);
      if (!playerAnswer) continue;
      
      let scoreChange = 0;
      
      // Award points for common answers
      if (playerAnswer.isCommon) {
        scoreChange += 1;
      }
      
      // Deduct points for black sheep
      if (playerAnswer.isBlackSheep) {
        scoreChange -= 1;
      }
      
      // Update player score
      if (scoreChange !== 0) {
        const newScore = player.score + scoreChange;
        await this.updatePlayer(player.id, { score: newScore });
      }
    }
    
    // Mark round as complete
    await this.updateRound(roundId, { isComplete: true });
  }
  
  // Initialize with standard questions if none exist
  async initializeStandardQuestions(): Promise<void> {
    const existingQuestions = await this.getAllQuestions();
    
    // Only initialize if we don't have any questions
    if (existingQuestions.length === 0) {
      const standardQuestions = [
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
      
      for (const questionText of standardQuestions) {
        await this.createQuestion({ text: questionText });
      }
    }
  }
}

// Initialize the database storage
export const storage = new DatabaseStorage();

// Initialize standard questions (do this as soon as possible)
(async () => {
  try {
    await storage.initializeStandardQuestions();
    console.log("Database initialized with standard questions");
  } catch (error) {
    console.error("Failed to initialize database with questions:", error);
  }
})();
