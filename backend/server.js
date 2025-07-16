const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for Base64 images

// Supabase credentials
const supabaseUrl = 'https://mjgqtckdqmclmlkrphsv.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ3F0Y2tkcW1jbG1sa3JwaHN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjU3NDEwMywiZXhwIjoyMDY4MTUwMTAzfQ.UDFIGhXubiPOnmrpBx_whik6q7LvUkRoIgnjTv6PVEQ'; // Replace with your service_role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Endpoint to add a new school
app.post('/api/add-school', async (req, res) => {
  try {
    const { name, location, price, unavailable_days, image } = req.body;

    // Validate required fields
    if (!name || !location || !price) {
      return res.status(400).json({ error: 'Name, location, and price are required' });
    }

    let imageUrl = null;
    if (image) {
      // Extract Base64 data (remove "data:image/png;base64," prefix)
      const base64Data = image.replace(/^data:image\/png;base64,/, '');
      const imageName = `${Date.now()}-${name.replace(/\s+/g, '-')}.png`;

      // Upload image to Supabase Storage
      const { data, error } = await supabase.storage
        .from('school-images')
        .upload(imageName, Buffer.from(base64Data, 'base64'), {
          contentType: 'image/png',
        });

      if (error) {
        console.error('Storage error:', error);
        return res.status(500).json({ error: 'Failed to upload image' });
      }

      // Get public URL for the image
      const { data: publicUrlData } = supabase.storage
        .from('school-images')
        .getPublicUrl(imageName);
      imageUrl = publicUrlData.publicUrl;
    }

    // Insert school data into Supabase
    const { data, error } = await supabase
      .from('schools')
      .insert([
        {
          name,
          location,
          price,
          unavailable_days,
          image_url: imageUrl,
          admissions: 0,
        },
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to add school to database' });
    }

    res.status(200).json({ message: 'School added successfully', school: data[0] });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});