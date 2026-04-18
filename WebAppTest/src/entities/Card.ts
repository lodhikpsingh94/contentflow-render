export class Card {
  static async list(sort: string = '-created_date'): Promise<any[]> {
    // Mock implementation - replace with actual API call
    return [
      {
        id: "1",
        card_number: "•••• 4829",
        card_type: "debit",
        card_name: "Primary Debit",
        balance: 12547.89,
        color: "blue",
        is_primary: true
      },
      {
        id: "2", 
        card_number: "•••• 7391",
        card_type: "credit",
        card_name: "Travel Rewards",
        balance: 8450.00,
        limit: 15000.00,
        color: "purple",
        is_primary: false
      }
    ];
  }
}