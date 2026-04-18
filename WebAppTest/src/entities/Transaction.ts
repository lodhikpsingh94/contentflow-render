export class Transaction {
  static async list(sort: string = '-date', limit: number = 10): Promise<any[]> {
    // Mock implementation - replace with actual API call
    return [
      {
        id: 1,
        description: "Starbucks Coffee",
        merchant: "Starbucks",
        amount: -4.95,
        type: "debit",
        category: "food",
        date: new Date().toISOString(),
        status: "completed"
      },
      {
        id: 2,
        description: "Salary Deposit",
        merchant: "Tech Corp",
        amount: 3500.00,
        type: "credit",
        category: "salary",
        date: new Date(Date.now() - 86400000).toISOString(),
        status: "completed"
      }
    ].slice(0, limit);
  }
}