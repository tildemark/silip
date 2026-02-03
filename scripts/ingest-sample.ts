import { PrismaClient } from '@prisma/client'
import { cacheService } from '../lib/redis'
import { createIngestionLog, completeIngestionLog } from './ingestion-utils'

const prisma = new PrismaClient()

/**
 * Sample ingestion script for DPA 2012
 * 
 * In production, this would:
 * 1. Scrape from official government sources
 * 2. Parse HTML/PDF content
 * 3. Extract sections
 * 4. Auto-tag based on content
 */

async function ingestDPASample() {
  console.log('🚀 Starting DPA 2012 sample ingestion...')

  // Create ingestion log
  const log = await createIngestionLog({
    source: 'DPA 2012 (Sample Data)',
    sourceUrl: 'https://www.privacy.gov.ph/data-privacy-act/',
    docType: 'DPA',
    metadata: {
      version: '1.0.0',
      type: 'sample',
      sections: 5,
    },
  })

  console.log(`📝 Created ingestion log: ${log.id}`)

  // Create or get the DPA document
  const dpaDoc = await prisma.legalDocument.upsert({
    where: { alias: 'DPA 2012' },
    update: {},
    create: {
      type: 'DPA',
      title: 'Data Privacy Act of 2012 (Republic Act No. 10173)',
      alias: 'DPA 2012',
      url: 'https://www.privacy.gov.ph/data-privacy-act/',
    },
  })

  console.log('✅ Created/found document:', dpaDoc.alias)

  // Sample sections from DPA 2012
  const sections = [
    {
      sectionNum: 'Section 3',
      title: 'Definition of Terms',
      content: `As used in this Act, the following terms are defined as follows:
(a) Consent of the data subject refers to any freely given, specific, informed indication of will, whereby the data subject agrees to the collection and processing of personal information about and/or relating to him or her. Consent shall be evidenced by written, electronic or recorded means. It may also be given on behalf of the data subject by an agent specifically authorized by the data subject to do so.
(b) Personal information refers to any information whether recorded in a material form or not, from which the identity of an individual is apparent or can be reasonably and directly ascertained by the entity holding the information, or when put together with other information would directly and certainly identify an individual.
(c) Sensitive personal information refers to personal information about an individual's race, ethnic origin, marital status, age, color, and religious, philosophical or political affiliations; health, education, genetic or sexual life of a person, or to any proceeding for any offense committed or alleged to have been committed by such person, the disposal of such proceedings, or the sentence of any court in such proceedings; issued by government agencies peculiar to an individual which includes, but not limited to, social security numbers, previous or current health records, licenses or its denials, suspension or revocation, and tax returns; and specifically established by an executive order or an act of Congress to be kept classified.`,
      tags: ['Consent', 'Personal Information', 'Sensitive Personal Information'],
    },
    {
      sectionNum: 'Section 13',
      title: 'Sensitive Personal Information and Privileged Information',
      content: `The processing of sensitive personal information and privileged information shall be prohibited, except in the following cases:
(a) The data subject has given his or her consent, specific to the purpose prior to the processing, or in the case of privileged information, all parties to the exchange have given their consent prior to processing;
(b) The processing of the same is provided for by existing laws and regulations: Provided, That such regulatory enactments guarantee the protection of the sensitive personal information and the privileged information: Provided, further, That the consent of the data subjects are not required by law or regulation permitting the processing of the sensitive personal information or the privileged information;
(c) The processing is necessary to protect the life and health of the data subject or another person, and the data subject is not legally or physically able to express his or her consent prior to the processing;
(d) The processing concerns such personal information as is necessary for the protection of lawful rights and interests of natural or legal persons in court proceedings, or the establishment, exercise or defense of legal claims, or when provided to government or public authority.`,
      tags: ['Sensitive Personal Information', 'Consent', 'Health Information', 'Legitimate Interest'],
    },
    {
      sectionNum: 'Section 20',
      title: 'Security of Personal Information',
      content: `(a) The personal information controller must implement reasonable and appropriate organizational, physical and technical security measures for the protection of personal information.
(b) The security measures shall aim to maintain the availability, integrity and confidentiality of personal information and protect them against any accidental or unlawful destruction, alteration and disclosure, as well as against any other unlawful processing.
(c) The personal information controller shall implement reasonable and appropriate measures to protect personal information against natural dangers such as accidental loss or destruction, and human dangers such as unlawful access, fraudulent misuse, unlawful destruction, alteration and contamination.
(d) The determination of the appropriate level of security under this section must take into account the nature of the personal information to be protected, the risks represented by the processing, the size of the organization and complexity of its operations, current data privacy best practices and the cost of security implementation.`,
      tags: ['Security Measures', 'Data Breach', 'Retention'],
    },
    {
      sectionNum: 'Section 25',
      title: 'Data Breach Notification',
      content: `The Commission shall be notified when sensitive personal information or other information that may, under the circumstances, be used to enable identity fraud are reasonably believed to have been acquired by an unauthorized person, and that the personal information controller or the Commission believes that such unauthorized acquisition is likely to give rise to a real risk of serious harm to any affected data subject.
The notification shall at least describe the nature of the breach, the sensitive personal information possibly involved, and the measures taken by the entity to address the breach. Notification may be delayed only to the extent necessary to avoid hindering the progress of a criminal investigation.`,
      tags: ['Data Breach', 'Security Measures'],
    },
    {
      sectionNum: 'Section 16',
      title: 'Rights of the Data Subject',
      content: `The data subject is entitled to:
(a) Be informed whether personal information pertaining to him or her shall be, are being or have been processed;
(b) Be furnished the information indicated hereunder before the entry of his or her personal information into the processing system of the personal information controller, or at the next practical opportunity: (1) Description of the personal information to be entered into the system; (2) Purposes for which they are being or are to be processed, including processing for direct marketing, profiling or historical, statistical or scientific purposes; (3) Basis of processing; (4) Recipients or classes of recipients to whom they are or may be disclosed;
(c) Reasonable access to, upon demand, the following: (1) Contents of his or her personal information that were processed; (2) Sources from which personal information were obtained; (3) Names and addresses of recipients of the personal information;
(d) Dispute the inaccuracy or error in the personal information and have the personal information controller correct it immediately and accordingly, unless the request is vexatious or otherwise unreasonable;
(e) Suspend, withdraw or order the blocking, removal or destruction of his or her personal information from the personal information controller's filing system upon discovery and substantial proof that the personal information are incomplete, outdated, false, unlawfully obtained, used for unauthorized purposes or are no longer necessary for the purposes for which they were collected.`,
      tags: ['Rights of Data Subjects', 'Access Request', 'Data Erasure', 'Transparency'],
    },
  ]

  // Get all tags for mapping
  const allTags = await prisma.tag.findMany()
  const tagMap = new Map(allTags.map((tag) => [tag.name.toLowerCase(), tag]))

  // Insert sections with tags
  for (const section of sections) {
    // Find matching tags
    const sectionTags = section.tags
      .map((tagName) => tagMap.get(tagName.toLowerCase()))
      .filter((tag) => tag !== undefined)

    await prisma.section.upsert({
      where: {
        id: `${dpaDoc.id}-${section.sectionNum.replace(/\s+/g, '-').toLowerCase()}`,
      },
      update: {
        title: section.title,
        content: section.content,
        tags: {
          set: sectionTags.map((tag) => ({ id: tag!.id })),
        },
      },
      create: {
        id: `${dpaDoc.id}-${section.sectionNum.replace(/\s+/g, '-').toLowerCase()}`,
        documentId: dpaDoc.id,
        sectionNum: section.sectionNum,
        title: section.title,
        content: section.content,
        tags: {
          connect: sectionTags.map((tag) => ({ id: tag!.id })),
        },
      },
    })

    console.log(`✅ Ingested: ${section.sectionNum} - ${section.title}`)
  }

  console.log('\n🎉 Sample ingestion completed!')
  console.log('📊 Summary:')
  console.log(`   - Document: ${dpaDoc.alias}`)
  console.log(`   - Sections: ${sections.length}`)

  // Update ingestion log
  await completeIngestionLog(log.id, sections.length, 'COMPLETED')
  console.log('✅ Ingestion log updated')

  // Invalidate search cache
  console.log('\n🔄 Invalidating search cache...')
  await cacheService.invalidateSearchCache()
  console.log('✅ Cache invalidated')
}

// Run the ingestion
ingestDPASample()
  .catch((e) => {
    console.error('❌ Ingestion failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
