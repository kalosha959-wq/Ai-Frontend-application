#!/usr/bin/env node

/**
 * AI Story Studio - Button Test Suite
 * Tests all interactive buttons and functionality
 */

const puppeteer = require('puppeteer');
const chalk = require('chalk');

class ButtonTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.baseUrl = 'http://localhost:3000';
    }

    async init() {
        console.log(chalk.blue('🚀 Starting AI Story Studio Button Tests...'));

        this.browser = await puppeteer.launch({
            headless: process.env.CI ? true : false,
            defaultViewport: { width: 1280, height: 720 },
            slowMo: process.env.CI ? 0 : 50,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();

        // Listen for console errors
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(chalk.red('Browser Error:'), msg.text());
            }
        });

        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        console.log(chalk.green('✅ Page loaded successfully'));
    }

    async testButton(selector, testName, action = 'click') {
        try {
            console.log(chalk.yellow(`🔍 Testing: ${testName}`));

            // Wait for button to be available
            await this.page.waitForSelector(selector, { timeout: 5000 });

            // Check if button exists
            const button = await this.page.$(selector);
            if (!button) {
                throw new Error(`Button not found: ${selector}`);
            }

            // Check if button is visible
            const isVisible = await this.page.evaluate(sel => {
                const element = document.querySelector(sel);
                return element && window.getComputedStyle(element).display !== 'none';
            }, selector);

            if (!isVisible) {
                throw new Error(`Button not visible: ${selector}`);
            }

            // Perform the action
            if (action === 'click') {
                await this.page.click(selector);
                await this.page.waitForTimeout(500); // Wait for any animations
            }

            this.testResults.push({
                test: testName,
                selector: selector,
                status: 'PASS',
                error: null
            });

            console.log(chalk.green(`✅ ${testName} - PASSED`));
            return true;

        } catch (error) {
            this.testResults.push({
                test: testName,
                selector: selector,
                status: 'FAIL',
                error: error.message
            });

            console.log(chalk.red(`❌ ${testName} - FAILED: ${error.message}`));
            return false;
        }
    }

    async testModalInteraction(buttonSelector, modalSelector, testName) {
        try {
            console.log(chalk.yellow(`🔍 Testing Modal: ${testName}`));

            // Click button to open modal
            await this.page.click(buttonSelector);
            await this.page.waitForTimeout(500);

            // Check if modal is visible
            const isModalVisible = await this.page.evaluate(sel => {
                const modal = document.querySelector(sel);
                return modal && !modal.classList.contains('hidden');
            }, modalSelector);

            if (!isModalVisible) {
                throw new Error(`Modal not visible after clicking button`);
            }

            // Try to close modal (click outside or close button)
            const closeButton = await this.page.$(`${modalSelector} [id*="close"]`);
            if (closeButton) {
                await closeButton.click();
            } else {
                // Click outside modal
                await this.page.click('body');
            }

            await this.page.waitForTimeout(500);

            this.testResults.push({
                test: testName,
                selector: buttonSelector,
                status: 'PASS',
                error: null
            });

            console.log(chalk.green(`✅ ${testName} - PASSED`));
            return true;

        } catch (error) {
            this.testResults.push({
                test: testName,
                selector: buttonSelector,
                status: 'FAIL',
                error: error.message
            });

            console.log(chalk.red(`❌ ${testName} - FAILED: ${error.message}`));
            return false;
        }
    }

    async testFormSubmission(formSelector, testName) {
        try {
            console.log(chalk.yellow(`🔍 Testing Form: ${testName}`));

            // Fill form fields with test data
            const inputs = await this.page.$$(`${formSelector} input`);
            for (let input of inputs) {
                const type = await input.evaluate(el => el.type);
                const placeholder = await input.evaluate(el => el.placeholder);

                if (type === 'email') {
                    await input.type('test@example.com');
                } else if (type === 'password') {
                    await input.type('testpassword123');
                } else if (type === 'text') {
                    await input.type('Test input data');
                }
            }

            // Find and click submit button
            const submitButton = await this.page.$(`${formSelector} button[type="submit"]`);
            if (submitButton) {
                await submitButton.click();
                await this.page.waitForTimeout(1000);
            }

            this.testResults.push({
                test: testName,
                selector: formSelector,
                status: 'PASS',
                error: null
            });

            console.log(chalk.green(`✅ ${testName} - PASSED`));
            return true;

        } catch (error) {
            this.testResults.push({
                test: testName,
                selector: formSelector,
                status: 'FAIL',
                error: error.message
            });

            console.log(chalk.red(`❌ ${testName} - FAILED: ${error.message}`));
            return false;
        }
    }

    async runAllTests() {
        console.log(chalk.blue('\n📋 Starting Comprehensive Button Tests...\n'));

        // Navigation Bar Tests
        console.log(chalk.cyan('🧭 Navigation Bar Tests'));
        await this.testButton('#pricing-btn', 'Pricing Button');
        await this.testButton('#signin-btn', 'Sign In Button');
        await this.testButton('#tutorial-btn', 'Tutorial Button');
        await this.testButton('#mobile-menu-btn', 'Mobile Menu Button');

        // Modal Tests
        console.log(chalk.cyan('\n📱 Modal Interaction Tests'));
        await this.testModalInteraction('#pricing-btn', '#pricing-modal', 'Pricing Modal');
        await this.testModalInteraction('#signin-btn', '#signin-modal', 'Sign In Modal');

        // Check if features button exists
        const featuresBtn = await this.page.$('#features-btn');
        if (featuresBtn) {
            await this.testModalInteraction('#features-btn', '#features-modal', 'Features Modal');
        }

        // Video Generation Tests
        console.log(chalk.cyan('\n🎬 Video Generation Tests'));
        await this.testButton('#generate-text-to-video-btn', 'Generate Video Button');
        await this.testButton('#suggest-idea-btn', 'Suggest Idea Button');
        await this.testButton('#upload-device-btn', 'Upload Device Button');
        await this.testButton('#browse-ai-library-btn', 'Browse AI Library Button');

        // AI Assistant Tests
        console.log(chalk.cyan('\n🤖 AI Assistant Tests'));
        await this.testButton('#suggest-music-btn', 'Suggest Music Button');
        await this.testButton('#suggest-edits-btn', 'Suggest Edits Button');
        await this.testButton('#generate-storyboard-btn', 'Generate Storyboard Button');
        await this.testButton('#generate-character-btn', 'Generate Character Button');

        // Tutorial Section Tests
        console.log(chalk.cyan('\n📚 Tutorial Tests'));
        await this.testButton('#play-tutorial-btn', 'Play Tutorial Button');

        // Form Tests
        console.log(chalk.cyan('\n📝 Form Tests'));

        // Test sign-in form
        await this.page.click('#signin-btn');
        await this.page.waitForTimeout(500);
        await this.testFormSubmission('#signin-form', 'Sign In Form');

        // Close modal
        const closeSignInBtn = await this.page.$('#close-signin-modal');
        if (closeSignInBtn) {
            await closeSignInBtn.click();
        }

        // Test slider interactions
        console.log(chalk.cyan('\n🎚️ Slider Tests'));
        await this.testButton('#video-duration-slider', 'Duration Slider', 'change');

        // Test video plan generation with actual input
        console.log(chalk.cyan('\n🎯 End-to-End Video Generation Test'));
        await this.testVideoGeneration();
    }

    async testVideoGeneration() {
        try {
            console.log(chalk.yellow('🔍 Testing: Complete Video Generation Flow'));

            // Fill in video prompt
            const promptTextarea = await this.page.$('#text-to-video-prompt');
            if (promptTextarea) {
                await promptTextarea.clear();
                await promptTextarea.type('A robot dancing in a futuristic garden with colorful flowers');
            }

            // Set duration
            const durationSlider = await this.page.$('#video-duration-slider');
            if (durationSlider) {
                await durationSlider.evaluate(slider => slider.value = 15);
            }

            // Click generate button
            await this.page.click('#generate-text-to-video-btn');

            // Wait for response (up to 10 seconds)
            await this.page.waitForTimeout(3000);

            // Check if video plan appeared
            const videoPlanContainer = await this.page.$('#video-plan-container');
            const isVisible = await videoPlanContainer.evaluate(el =>
                !el.classList.contains('hidden')
            );

            if (isVisible) {
                console.log(chalk.green('✅ Video Generation Flow - PASSED'));
                this.testResults.push({
                    test: 'Video Generation Flow',
                    selector: '#generate-text-to-video-btn',
                    status: 'PASS',
                    error: null
                });
            } else {
                throw new Error('Video plan container not visible after generation');
            }

        } catch (error) {
            console.log(chalk.red(`❌ Video Generation Flow - FAILED: ${error.message}`));
            this.testResults.push({
                test: 'Video Generation Flow',
                selector: '#generate-text-to-video-btn',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async generateReport() {
        console.log(chalk.blue('\n📊 Test Results Summary\n'));

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;

        console.log(chalk.green(`✅ Passed: ${passed}`));
        console.log(chalk.red(`❌ Failed: ${failed}`));
        console.log(chalk.blue(`📈 Total Tests: ${total}`));
        console.log(chalk.yellow(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`));

        if (failed > 0) {
            console.log(chalk.red('\n🚨 Failed Tests:'));
            this.testResults.filter(r => r.status === 'FAIL').forEach(result => {
                console.log(chalk.red(`  • ${result.test}: ${result.error}`));
            });
        }

        // Generate detailed report file
        const reportContent = {
            timestamp: new Date().toISOString(),
            summary: { passed, failed, total, successRate: `${((passed / total) * 100).toFixed(1)}%` },
            results: this.testResults
        };

        const fs = require('fs');
        fs.writeFileSync('test-report.json', JSON.stringify(reportContent, null, 2));
        console.log(chalk.blue('\n📄 Detailed report saved to: test-report.json'));
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log(chalk.blue('\n🧹 Browser closed successfully'));
        }
    }
}

// Main execution
async function main() {
    const tester = new ButtonTester();

    try {
        await tester.init();
        await tester.runAllTests();
        await tester.generateReport();
    } catch (error) {
        console.log(chalk.red('🚨 Test suite failed:'), error.message);
    } finally {
        await tester.cleanup();
    }
}

// Check if required dependencies are available
function checkDependencies() {
    try {
        require('puppeteer');
        require('chalk');
        return true;
    } catch (error) {
        console.log(chalk.red('❌ Missing dependencies. Please install:'));
        console.log(chalk.yellow('npm install puppeteer chalk'));
        return false;
    }
}

if (require.main === module) {
    if (checkDependencies()) {
        main();
    }
}

module.exports = ButtonTester;
