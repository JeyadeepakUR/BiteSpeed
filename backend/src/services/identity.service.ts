import prisma from '../utils/db';

export const reconcileIdentity = async (email?: string, phoneNumber?: string) => {
    return await prisma.$transaction(async (tx: any) => {
        // 1. Find directly matching contacts (Lock them for update to prevent concurrent modification)
        const matchingContacts = await tx.$queryRaw`
            SELECT * FROM "Contact"
            WHERE ("email" = ${email || ''} OR "phoneNumber" = ${phoneNumber || ''})
            ORDER BY "createdAt" ASC
            FOR UPDATE
        `;

        // 2. Base Case: No matches, create new primary
        if (!matchingContacts || matchingContacts.length === 0) {
            // Re-verify inside transaction to avoid racecondition insert
            const raceCheck = await tx.contact.findFirst({
                where: { OR: [...(email ? [{ email }] : []), ...(phoneNumber ? [{ phoneNumber }] : [])] }
            });

            if (!raceCheck) {
                const newContact = await tx.contact.create({
                    data: {
                        email: email || null,
                        phoneNumber: phoneNumber || null,
                        linkPrecedence: 'primary',
                    },
                });
                return formatResponse(newContact.id, [newContact]);
            } else {
                matchingContacts.push(raceCheck);
            }
        }

        // Helper to find absolute root of any contact
        const findRoot = async (contactId: number): Promise<number> => {
            let currentId = contactId;
            while (true) {
                const node = await tx.contact.findUnique({ where: { id: currentId } });
                if (!node || node.linkPrecedence === 'primary') return currentId;
                if (!node.linkedId) return currentId; // Should not happen but safety fallback
                currentId = node.linkedId;
            }
        };

        // 3. Collect all unique ROOT primary IDs from matches
        const rootPrimaryIds = new Set<number>();
        for (const contact of matchingContacts) {
            const rootId = await findRoot(contact.id);
            rootPrimaryIds.add(rootId);
        }

        // 4. Fetch the entire cluster for these root primary IDs
        const allRelatedContacts = await tx.contact.findMany({
            where: {
                OR: [
                    { id: { in: Array.from(rootPrimaryIds) } },
                    { linkedId: { in: Array.from(rootPrimaryIds) } }
                ]
            },
            orderBy: { createdAt: 'asc' },
        });

        // Sort by createdAt to explicitly find the oldest primary
        const sortedRelated = allRelatedContacts.sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime());

        // The absolute oldest node in the entire cluster becomes the undisputed Primary
        const primary = sortedRelated[0];

        // 5. Check if we need to cross-link other primaries or repoint secondaries
        const updatePromises = [];
        for (const contact of sortedRelated) {
            if (contact.id !== primary.id) {
                if (contact.linkPrecedence === 'primary' || contact.linkedId !== primary.id) {
                    updatePromises.push(
                        tx.contact.update({
                            where: { id: contact.id },
                            data: { linkPrecedence: 'secondary', linkedId: primary.id },
                        })
                    );
                    contact.linkPrecedence = 'secondary';
                    contact.linkedId = primary.id;
                }
            }
        }

        // 6. Check if we need to create a new secondary for new information
        const clusterEmails = new Set(sortedRelated.map((c: any) => c.email).filter(Boolean));
        const clusterPhones = new Set(sortedRelated.map((c: any) => c.phoneNumber).filter(Boolean));

        const isNewEmail = email && !clusterEmails.has(email);
        const isNewPhone = phoneNumber && !clusterPhones.has(phoneNumber);

        let newSecondary = null;
        if (isNewEmail || isNewPhone) {
            newSecondary = await tx.contact.create({
                data: {
                    email: email || null,
                    phoneNumber: phoneNumber || null,
                    linkedId: primary.id,
                    linkPrecedence: 'secondary',
                },
            });
        }

        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
        }

        const finalContacts = newSecondary ? [...sortedRelated, newSecondary] : sortedRelated;
        return formatResponse(primary.id, finalContacts);
    });
};

function formatResponse(primaryId: number, contacts: any[]) {
    const emails = new Set<string>();
    const phoneNumbers = new Set<string>();
    const secondaryContactIds: number[] = [];

    const primaryContact = contacts.find(c => c.id === primaryId);
    if (primaryContact?.email) emails.add(primaryContact.email);
    if (primaryContact?.phoneNumber) phoneNumbers.add(primaryContact.phoneNumber);

    contacts.forEach(c => {
        if (c.email) emails.add(c.email);
        if (c.phoneNumber) phoneNumbers.add(c.phoneNumber);
        if (c.id !== primaryId) secondaryContactIds.push(c.id);
    });

    return {
        contact: {
            primaryContactId: primaryId,
            emails: Array.from(emails),
            phoneNumbers: Array.from(phoneNumbers),
            secondaryContactIds,
        }
    };
}
