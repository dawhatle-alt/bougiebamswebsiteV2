import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Faq() {
  const faqs = [
    {
      category: "Ordering & Shipping",
      items: [
        {
          q: "How long will it take to receive my order?",
          a: "Standard shipping typically takes 3-5 business days within the continental US. Expedited 2-day shipping is available at checkout. Customized or engraved items require an additional 5-7 business days for processing."
        },
        {
          q: "Do you ship internationally?",
          a: "Currently, we ship to the US and Canada. We are working on expanding our international shipping options soon."
        },
        {
          q: "Will I receive tracking information?",
          a: "Yes, once your order ships, you will receive an email with tracking information so you can monitor its progress."
        }
      ]
    },
    {
      category: "Products & Quality",
      items: [
        {
          q: "What materials are your tiles made from?",
          a: "Our tiles are crafted from high-density, scratch-resistant acrylic. This ensures a satisfying weight and a beautiful sound when shuffling, while maintaining extreme durability."
        },
        {
          q: "Can I use your sets for tournament play?",
          a: "Yes. Our standard sets meet the dimension requirements for American Mahjong tournament play."
        },
        {
          q: "How should I clean my tiles?",
          a: "Wipe them gently with a soft, dry or slightly damp microfiber cloth. Do not use harsh chemicals or submerge them in water, as this can damage the hand-painted engravings."
        }
      ]
    },
    {
      category: "Returns & Exchanges",
      items: [
        {
          q: "What is your return policy?",
          a: "We accept returns on unused, non-customized items in their original packaging within 30 days of delivery. A small return shipping fee applies."
        },
        {
          q: "My set arrived damaged. What should I do?",
          a: "Please contact our support team immediately at concierge@bougiebams.com with photos of the damage, and we will arrange a replacement right away."
        }
      ]
    }
  ];

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8 max-w-3xl">
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl mb-6">FAQ</h1>
          <p className="text-muted-foreground font-serif text-xl">
            Everything you need to know about BougieBams.
          </p>
        </div>

        <div className="space-y-16">
          {faqs.map((section, idx) => (
            <div key={idx}>
              <h2 className="font-sans font-semibold tracking-widest uppercase text-sm text-primary mb-6 border-b border-border pb-4">
                {section.category}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {section.items.map((item, i) => (
                  <AccordionItem key={i} value={`item-${idx}-${i}`} className="border-b border-border py-2">
                    <AccordionTrigger className="font-serif text-xl hover:no-underline hover:text-primary text-left">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="font-serif text-lg text-muted-foreground leading-relaxed pt-2 pb-6">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
