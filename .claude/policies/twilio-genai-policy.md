# Twilio Generative AI Policy

**Status:** Published  
**Effective Date:** 24 February 2025  
**Policy Version:** v.2  
**Policy Owner(s):**

- Tony Arous - Chief Information Security Officer
- Amy Holcroft - Chief Privacy Officer
- Zachary Hanif - VP, Group Architecture, AI

**Policy Review Dates:** Annually - 29 April 2026

## Overview

At Twilio, we recognize that Artificial Intelligence (AI) has the potential to transform the way we work, live and interact with the world around us.

Generative AI (GenAI), for example OpenAI, is very much in focus as a powerful tool that has the potential to create significant advantages for our business through the generation of a wide variety of data, such as text, code, images, audio, video or 3D content. We believe that its use will give us the ability to improve our products and services and create new opportunities for our customers, partners and employees. GenAI can also help us make more informed decisions, save time and resources by automating and optimizing processes and avoid mistakes and "human error".

However, GenAI comes with risks and challenges and, if not used appropriately, can have a significant negative impact on our business, individuals, communities, and potentially society as a whole. We are committed to using GenAI in an ethical, legal and responsible way that respects human, intellectual property and privacy rights, values diversity and promotes social responsibility.

Twilio is actively exploring different use cases related to the use of GenAI in our products and internal business functions.

## Scope

This policy applies globally to all Team Members with respect to the use of GenAI for any business-related purpose.

The purpose of this policy is to set out some basic rules and guidelines for using GenAI that enables the exploration and adoption of GenAI use cases without creating legal risk to the company or to the interests and rights of our employees, business partners, customers and third parties.

You are reminded of the need to ensure all GenAI use cases comply with applicable corporate policies and complete all required reviews and approvals.

It should be noted that there is a great deal of legal uncertainty surrounding the use and capabilities of GenAI and this policy will be adapted on an on-going basis to address new developments.

## Policy

### Basic Ground Rules

#### Use of GenAI That Has Not Been Acquired Through Procurement

GenAI that is available on a free or freemium basis, open source or otherwise acquired outside the corporate procurement process (Non-Approved GenAI) must be used in a limited way. The free version of ChatGPT is Non-Approved GenAI.

Non-Approved GenAI may only be used with Prompt Data that is classified as Public Data in the Data Classification Policy (see extract below).

Non-Approved GenAI may also be used by R&D teams:

- with source code or product research and development data that contains no material intellectual property or trade secrets (i.e. proprietary algorithms). The Open Source Policy provides a useful guide and, as a general rule, if we would release the code or data as open source, it can be used with Non-Approved GenAI; and
- for limited code use cases, including to generate test code, refactoring existing code to be cleaner, generating boilerplate common code, writing explanatory documentation and how-tos for code and answering questions across Twilio's publicly available technical knowledge base.

**Public Data:** This is the lowest level of data classification. Public data is intended for external release, use by non-employees, or has been downloaded from publicly available sources free of charge. Unauthorized disclosure of Public Data would result in little or no risk to Twilio, its customers, and/or end users.

Examples:

- Published Twilio corporate information
- Publicly Available Regulatory Filings: information such as any Twilio Securities and Exchange Commission (SEC) filings.
- Published Marketing Content: white papers and/or public facing blogs.
- Press Releases
- Product Brochures
- Public Presentations

If the Prompt Data you are considering using is not listed or you are unsure of the correct classification, please submit a question to the Privacy team via the Privacy ServiceNow form.

#### Use of Approved GenAI Products

We are setting up enterprise accounts with selected GenAI Service Providers to use certain products (Approved GenAI). This is managed through the procurement process to ensure that the products have been fully vetted and can be used in an appropriate, safe and legal manner. The following GenAI Service Provider products are approved for general use:

| GenAI Service Provider    | Approved GenAI Products                                          |
| ------------------------- | ---------------------------------------------------------------- |
| Open AI Inc.              | GPT4/GPT5 API, Reasoning Model API, DALL E-2 and Whisper         |
| Amazon Web Services, Inc. | CodeWhisperer for coding usage, Comprehend, Personalise, Bedrock |
| Google                    | Google Vertex AI, Dialogflow                                     |
| Github                    | Github AI - Copilot                                              |
| Microsoft                 | Azure Open AI                                                    |

**Please note that the free version of ChatGPT is Non-Approved GenAI for security reasons and can only be used with Public Data as Prompt Data.**

You may only use approved Generative AI tools with prompt data classified as Restricted or Confidential under the Data Classification & Data Handling Policy. Before use, you must ensure your use case complies with all relevant corporate policies and that you have completed any required approvals, including privacy impact assessments, and legal or security reviews. Text-to-image generation is provided by our existing enterprise OpenAI license; use of generated images in customer-facing Twilio products must go through business justification and appropriate marketing approvals.

### Input Data

Particular care must be taken when dealing with Input Data because GenAI may process data differently from other types of software and the use of Input Data can be considered a disclosure of such data. Therefore, using Input Data can create particular risks related to personal data, confidentiality, security and intellectual property rights. Input Data must not include any unauthorised or private personal data, confidential, or proprietary information.

You are reminded of your obligation to maintain confidentiality under the terms of your employment contract, your Proprietary Information, Inventions, Non-Competition and Non- Solicitation Agreement (and any other similar agreement you executed), or terms of engagement with Twilio and Twilio's Code of Conduct.

#### Personal Data

To avoid violating privacy laws, our Binding Corporate Rules and customer contracts when using personal data of our employees, customers or business partners as Input Data, you must comply with the following requirements:

##### 1. Data Protection Agreement

There must be a Data Protection Agreement ("DPA") in place with the GenAI Service Provider. The term Personal Data is to be understood very broadly and, depending on the type of Input Data, includes the following information:

- **Text:** Names, addresses, telephone numbers, unique identifiers, message content and any other information that can be attributed to an individual person.
- **Images and video:** Images or videos of persons who are recognisable as individuals, whether they are photographs, video footage, drawings or artificial images.
- **Sound:** Recordings in which a certain person is named or the voice of a certain person that can be attributed to him or her.

If there is no DPA in place or we are unable to enter into a DPA with the GenAI Service Provider, you are prohibited from using Personal Data as Input Data.

##### 2. Consultation with the Privacy team and Privacy Impact Assessments

You must consult with the Privacy team and complete a Privacy Impact Assessment if necessary prior to using GenAI. This is needed to ensure compliance with applicable privacy laws and our Binding Corporate Rules and that we are not creating unacceptable risk for individuals. This will include:

- Checking Twilio has a legal basis for processing personal data through GenAI as Input Data. In some cases, we will be able to rely on Twilio's legitimate interest in the processing, but the consent of an individual or our customer may be required to be able to use personal data as Input Data.
- Ensuring Twilio is not using GenAI to make automated decisions about someone that directly affects them, e.g. profiling, assessing or rating someone
- Updating Twilio's Privacy Notice, Global Employee Privacy or other notices to provide transparency about how we use GenAI.

#### Intellectual Property and Confidentiality

Improper use of third-party data as Input Data could violate the third party's confidentiality or intellectual property (IP) rights. Likewise, improper use of our own data could damage Twilio's IP rights. This is of particular risk when Input Data is used as Training Data and parts or patterns of it can be regenerated elsewhere as Output Data. Whenever possible, obtain the GenAI Service Provider's agreement not to use Input Data as Training Data.

Do not use third-party IP or confidential data (e.g., data shared with Twilio under a nondisclosure agreement and designated as confidential by the third party) as Input Data without the third party's express permission, and use it only to the extent authorised. For example, usage rights we have to third-party data often will not cover use of such data as Training Data. Accordingly, we may not use such third-party data as Input Data if the GenAI Service Provider will then use it as Training Data.

To protect Twilio's own IP and confidentiality interests, use our confidential data only as outlined in the section above. Exercise caution when using Twilio IP as Prompt Data if the GenAI Service Provider may use it as Training Data. In that case, we lose control over the GenAI Service Provider's further use of our IP. This makes it easier for others to use our IP and hinders our ability to enforce our rights in it. If in doubt, you should consult with the IP Legal team via ServiceNow about the specific use of protected content as Prompt Data.

#### Multi-client fine-tuning

When using Fine-Tuning Data, ensure that the GenAI Service Provider only uses the data for training our models for our and/or our customers' exclusive use. This data must not be used for other purposes (e.g., general software development).

### Output Data

As a general rule, Output Data should only be used internally or made available to customers through usage of a product or service.

#### Intellectual Property

Twilio's use of Output Data presents legal challenges with respect to third-party IP, which must be addressed as follows:

##### Acquisition of commercial usage rights from GenAI Service Provider

It is important that we obtain the necessary rights to use Output Data for our business purposes. Make sure that the GenAI Service Provider assigns the Output Data or grants a broad license to all usage rights, as are necessary to carry out our business purposes, to Twilio. In particular, the usage rights must cover commercial use. Whenever possible, ensure that the GenAI Service Provider's agreement will not use our Output Data as Training Data. Note that this does not release Twilio from the obligation to independently check whether the Output Data violates third-party rights before using it.

##### Review for third-party intellectual property

Even if the GenAI Service Provider assigns or grants a licence to the Output Data, there may be relevant third-party rights to consider, especially copyrights. Most GenAI Service Providers expressly disclaim any warranty that the Output Data will not infringe third-party IP rights. Therefore, the onus is on Twilio to review and ensure that Output Data is not infringing.

The GenAI we use can be steered to create Output Data that resembles preexisting works. If the Output Data is too similar to a copyrighted work, then Twilio's use of the Output Data exposes Twilio to the risk of IP infringement liability.

To reduce the risk of liability for misusing third-party IP, take the following steps:

- Never use GenAI intentionally to generate copies, reproductions, or derivatives of pre-existing works.
- Review Output Data that will be used externally for substantial similarity to preexisting works. You are not expected to vet against all prior content, but use your best judgment based on the nature and purpose of the Output Data as well as your prior knowledge and experience. You can use tools like Google to search for identical or similar text and images or plagiarism checking tools (your queries are Input Data in this context, so keep in mind the guidelines for using confidential data outlined above). Consult with the IP Legal team via ServiceNow for assistance.
- If possible, make adjustments to Output Data (such as changing or adding new creative content) before we use it externally.
- If available, check configurations for GenAI to minimize use of or identify third party IP or references in the Output Data.
- Where possible, please keep a record of Output Data in case we need to review it to determine whether Twilio or a third party have IP rights in the data.

#### Personal Data

Output Data can constitute personal data, for example, where it allows us to create artificial images of a person, recreate a person's voice or generate a text about a person. Even if the information generated is not real, but can be attributed to that person, Twilio must comply with privacy laws when using this data. To address this you must seek advice from the Privacy team if the Output Data creates personal data.

#### Output Accuracy, Security and Bias

GenAI is prone to errors and can also produce biased, illegal, abusive, unsafe content that can cause harm to individuals and our business. To address this the following requirements must be met:

- **Human Review** - Output Data must be subject to a human review to make sure it is accurate, suited for its intended purpose, and free from illegal or harmful content before being used.
- **Security Testing** - If GenAI is used to generate code this must be extensively tested in a secure environment before it is used to ensure it does not create any security risks.
- **Bias Review** - To avoid Output Data being used in a way that results in unlawful bias or discrimination, it must be routinely reviewed to check whether the content contains patterns indicative of bias and addressed through adaptations to the Input Data.

### Transparency

Twilio's customers, business partners and employees have an interest in knowing when their data is being processed by GenAI. Where appropriate, transparency about the use of GenAI must be provided to impacted groups, via a privacy notice or product documentation. If customers are communicating directly with a GenAI product, this must be clearly communicated to them at the outset.

## Monitoring & Compliance

Reporting violations of this policy is an obligation of all Team Members under the Code of Conduct. Any Team Member found to be in violation of this policy may be subject to disciplinary action, up to and including termination of employment, or contractual agreement.

Where a violation of the policy may also constitute a data breach, for example because Critical Personal Data has been used as Prompt Data in Non-Approved GenAI, please go to Slack and type `/page-security-sirt` along with a brief message explaining what the incident involves.

## Exceptions

Any exceptions to this policy must be approved by the Chief Privacy Officer.

## Questions

If you have any questions about this Policy please contact the Privacy team via ServiceNow form.

## Approved AI Tools

For more information about what specific Generative AI Tools are approved for use by employees, please review the AI Toolkit or reach out to the IT Team. Twilio has an enterprise agreement with OpenAI and employees can access all products and API's available in the OpenAI platform (specifically https://platform.openai.com/), once that user is logged in via Okta SSO. All AI models available in Amazon Bedrock are also available to use, pending any necessary additional reviews.

## Data Classifications

### Restricted Data

**Customer Content (Personal Data and non-Personal Data)**

- Contents of voice, video, email, SMS, MMS, RCS, chat or fax communications traffic whether in-flight or stored prior to or post delivery
- Subject lines of customer emails
- Transcriptions of any communications
- Recordings of any communications

**Communications Usage Data (Meta data)**

- Phone Numbers/caller ID
- Call Detail Records - to and from number, date time and duration of communication

**Customer Proprietary Network Information (CPNI)**

- US customers (individual or corporate) call detail records
- Certain call metadata: destination numbers and locations, call duration, time/date of calls

**Location Data**

- Geo-location data that allows tracking individual end user devices
- Coarse location data allowing general vicinity of an end user device

**Current or former employee data relating to:**

- Work contracts, performance data, termination data
- Accommodations, medical/disability data
- Authentication/credentials, geo-location data
- Recordings or transcripts of internal/external meetings, customer interactions
- PHI or medical/health data, misconduct investigations
- Grievances, whistleblowing

**Sensitive Personal Data**

- Financial information, bank account numbers
- Employment, genetic, biometric or health/medical information (including PHI)
- Racial, ethnic, political, or religious affiliation
- Trade union membership, sexual orientation information
- Account passwords, mother's maiden name, date of birth
- Criminal history

**Identification Data**

- Identification documents (passports, driver's licenses, national identity cards)
- Unique government identifiers (SSN, passport numbers, driver's license numbers)
- Original signatures
- Date of Birth (when combined with other identifying information)

**Authentication Data or Credentials**

- Data used to validate an entity (person, process or service)

**Non-proprietary data covered by NDA**

**Financial Data**

- Non-public financial statements and disclosures
- M&A Strategy, Planning & Due diligence records
- Strategic & Company wide financial plans, forecasts, and budgets
- Tax strategy and unfiled tax documents

**Legal Proceedings**

- Documentation related to contemplated or actual legal proceedings

**Strategy / Planning Documentation**

- Strategic plans and roadmaps (corporate and business unit level)
- Annual and multi-year business plans
- Market and competitive analysis reports
- Investment and capital allocation strategies

**Non-Public data**

- Securities filings prior to publication
- Changes in leadership or corporate structure
- Product launches, strategic partnerships
- Internal reports on security, ethics, regulatory investigations

**Attorney/Client Privileged Communications**

**Material Non-Public Information (MNPI)**

**Communications with Regulators and Law Enforcement**

### Confidential Data

**Internal communications**

- Any communication created by a Team Member in writing, email or via other communications tools

**Personal Data about current or former employees that is not Restricted Data**

- Tenure, name, job title, job location, work email

**Job Applicant Data**

- CVs and covering letters, interview scorecards
- Rejection criteria/reason, job offers

**Proprietary Data Intended for Internal Use**

- Source code
- Twilio trade secrets
- Twilio intellectual property
- Product research and development
- Proprietary computer software
- AI/ML models
- Fraud Ops processes and monitoring information
- SecOps processes and monitoring information

**Non-Public Confidential Financial Data**

- Financial records (Tax Records)
- Departmental / product level P&L statements
- Departmental/product level financial reporting and metrics

**Sales and Marketing Data**

- Leads, sales or marketing contacts and profiles

**Customer Account Data**

- Subscriber Records (name, address, IP address)
- 10DLC registration data

**Feedback**

- Customer feedback through surveys, questionnaires, support interactions
- Employee feedback in surveys and questionnaires

**Audit & Enterprise Risk Management**

- Audit scoping/planning files
- Audit fieldwork tests/workpapers
- Issue logs and remediation tracking
- Internal audit reports
- Certifications & attestations

**Internal Procedures and/or Internal Operating Manuals**

**Pseudonymized Data**

**Anonymized Data**

**Any other data produced by Twilio that is not classified as Restricted Data or Public Data**

## Definitions

**GenAI** is developed and pre-trained by third parties (GenAI Service Provider) and learns patterns from existing data (Training Data). This knowledge is then used to generate new and unique output (Output Data). Usually, this Output Data is generated based on a specific command, often called a "prompt", that contains a specific work instruction for the GenAI (Prompt Data). In this way, GenAI is capable of creating complex content that mimics human creativity or offers solutions to specific problems. For some use cases, we may fine-tune the GenAI with our own or a customer's data (Fine-Tuning Data). With the help of this data, it is possible to better adapt and tailor the software to complete specific tasks that meet the needs of Twilio or our customers. In this policy, Prompt Data and Fine-Tuning Data are referred to collectively as Input Data.

**Data** means recorded information, regardless of form, the media on which it is recorded, or the method of recording and includes source code and Personal Data.

**Personal Data** means information relating to an identified or identifiable natural person (data subject). An identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier, such as a name, an identification number, location data, an online identifier, or one or more factors specific to the physical, psychological, genetic, mental, economic, cultural or social identity of that natural person.

**Team Member** means any Twilio employee, director and Board member, as well as members of our extended workforce, including non-executive directors, independent contractors, contingent, or agency workers and interns.
