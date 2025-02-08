import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('contribution-graph', () => {
  // Mock the execSync function
  jest.spyOn(child_process, 'execSync');

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should get git log history', () => {
    // Mock git log response
    const mockGitLog = `
      commit abc123
      Author: Bhupendra Singh Bhandari
      Date: Mon Mar 18 2024 10:00:00
      
      feat: initial commit
    `;
    
    execSync.mockReturnValue(Buffer.from(mockGitLog));
    
    // Import the actual function that gets git log (you'll need to create this)
    const { getGitLog } = require('../index.js');
    
    const log = getGitLog();
    
    expect(execSync).toHaveBeenCalledWith(
      'git log --pretty=format:"%H%n%an%n%ad%n%s"',
      expect.any(Object)
    );
    
    expect(log).toContain('feat: initial commit');
  });

  test('should handle repository with no commits', () => {
    execSync.mockImplementation(() => {
      throw new Error('fatal: your current branch does not have any commits yet');
    });

    const { getGitLog } = require('../index.js');

    expect(() => getGitLog()).toThrow('No commits found in this repository');
  });

  test('should parse commit types correctly', () => {
    const mockCommits = [
      'feat: add new feature',
      'fix: resolve bug',
      'docs: update readme',
      'style: format code',
      'refactor: improve structure'
    ];

    const { analyzeCommitTypes } = require('../index.js');
    
    const analysis = analyzeCommitTypes(mockCommits);
    
    expect(analysis).toEqual({
      feat: 1,
      fix: 1,
      docs: 1,
      style: 1,
      refactor: 1
    });
  });

  test('should generate contribution summary', () => {
    const mockGitLog = `
      commit abc123
      Author: Bhupendra Singh Bhandari
      Date: Mon Mar 18 2024 10:00:00
      
      feat: add feature A
      
      commit def456
      Author: Bhupendra Singh Bhandari
      Date: Mon Mar 18 2024 11:00:00
      
      fix: resolve issue B
    `;

    execSync.mockReturnValue(Buffer.from(mockGitLog));

    const { generateContributionSummary } = require('../index.js');
    
    const summary = generateContributionSummary();
    
    expect(summary).toHaveProperty('totalCommits', 2);
    expect(summary).toHaveProperty('commitTypes');
    expect(summary.commitTypes).toHaveProperty('feat', 1);
    expect(summary.commitTypes).toHaveProperty('fix', 1);
  });
}); 