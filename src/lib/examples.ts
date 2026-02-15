// FRESCO Toolkit Examples
// Contextual examples for each step to guide users

export const TOOLKIT_EXAMPLES = {
  insight_stack: {
    1: {
      example: "Our team is launching a new mobile banking app for Gen Z users who are entering the workforce. We've noticed they manage money differently than older generations.",
      tip: "Be specific about who, what, and why. The more context, the better the insights."
    },
    2: {
      example: "Users check their balance 12x/day on average. 73% said they 'feel anxious' about money. Most save in spurts after payday then stop. They share savings goals with friends.",
      tip: "Include specific numbers, quotes, and behaviors you've observed."
    },
    3: {
      example: "Social validation drives saving behavior. Anxiety stems from lack of visibility, not lack of money. Small, frequent interactions build trust more than big features.",
      tip: "Look for recurring themes and connections between your observations."
    },
    4: {
      example: "They want to save but also want to spend freely. They trust peer recommendations but distrust institutions. They want automation but also control.",
      tip: "Tensions often reveal the most interesting design opportunities."
    },
    5: {
      example: "Gen Z doesn't need another budgeting tool – they need a financial ally that makes saving feel social and spending feel guilt-free.",
      tip: "Try to capture the 'aha' moment in one clear sentence."
    }
  },
  
  pov_generator: {
    1: {
      example: "Time-poor working parents with children under 10",
      tip: "Be specific about who you're designing for - age, context, situation."
    },
    2: {
      example: "quickly find trustworthy childcare options without endless research and reviews",
      tip: "Focus on the core need, not features or solutions."
    },
    3: {
      example: "trust is their scarcest resource and every childcare decision carries emotional weight",
      tip: "The 'because' should reveal a deeper human truth."
    },
    4: {
      example: "reducing decision friction is more valuable than adding more choices",
      tip: "What strategic implication follows from this truth?"
    }
  },
  
  mental_model_mapper: {
    domain: {
      example: "How enterprise buyers evaluate B2B SaaS purchases",
      tip: "Pick a specific domain where understanding the mental model matters."
    },
    beliefs: {
      example: "Assumption: Buyers care most about features. Fact: 78% say support quality matters more. Opinion: Price is the final deciding factor.",
      tip: "Tag each belief as assumption, fact, or opinion to reveal blind spots."
    }
  },
  
  flow_board: {
    starting: {
      example: "User lands on homepage after clicking a Google ad for 'project management software'",
      tip: "Be specific about how and why the user enters this flow."
    },
    steps: {
      example: "1. Scan headline and hero image (2-3 sec) → 2. Look for pricing link → 3. Compare plan features → 4. Look for 'Start Free Trial' button",
      tip: "Include timing and emotional state where relevant."
    },
    ideal: {
      example: "User confidently starts a free trial within 3 minutes, understanding exactly what they'll get and what happens next",
      tip: "Describe the ideal emotional and practical outcome."
    }
  },
  
  experiment_brief: {
    hypothesis: {
      example: "If we add social proof (customer logos) above the fold, first-time visitors will be 20% more likely to scroll past the hero section",
      tip: "Good hypotheses are specific, measurable, and falsifiable."
    },
    test: {
      example: "A/B test with 50/50 split. Control: current homepage. Variant: same page with 5 customer logos added. Run for 2 weeks or 5000 visitors.",
      tip: "Include sample size, duration, and what you'll measure."
    },
    success: {
      example: "Scroll depth increases by 20%+ with statistical significance (p<0.05). Secondary: time on page increases.",
      tip: "Define clear success criteria before you run the test."
    }
  },
  
  strategy_sketchbook: {
    question: {
      example: "Should we build our own ML recommendation engine or integrate a third-party solution?",
      tip: "Frame as a clear either/or or how-to question."
    },
    option: {
      example: "Build in-house: Full control, competitive moat, but 6-month timeline and $500K cost. Buy: Launch in 2 weeks, $50K/year, but vendor dependency.",
      tip: "Include key trade-offs for each option."
    }
  },
  
  ux_scorecard: {
    experience: {
      example: "Mobile checkout flow for returning customers",
      tip: "Be specific about which experience and for whom."
    },
    criteria: {
      example: "Clarity: 8/10 - Steps are clear but confirmation is buried. Speed: 6/10 - 4 taps minimum feels like 2 too many.",
      tip: "Score honestly and add brief notes explaining why."
    }
  },
  
  persuasion_canvas: {
    audience: {
      example: "Marketing managers at mid-size companies who currently use spreadsheets for campaign tracking",
      tip: "The more specific, the more targeted your persuasion strategy."
    },
    beliefs: {
      example: "They believe dedicated tools are expensive and hard to learn. They trust peer recommendations over vendor claims.",
      tip: "Understanding current beliefs helps you meet them where they are."
    },
    change: {
      example: "We want them to believe that switching to our tool will save them 5+ hours per week and be easy to learn",
      tip: "Be clear about the belief shift you're trying to create."
    }
  },
  
  performance_grid: {
    subject: {
      example: "Q4 product launch campaign performance",
      tip: "Be specific about what you're measuring and the time period."
    },
    metric: {
      example: "Conversion rate: Target 3.5%, Actual 2.8%, Trend ↓ - Below target due to landing page issues identified last week",
      tip: "Include context about why metrics are where they are."
    }
  }
};
