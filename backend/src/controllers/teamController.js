export const getTeam = async (req, res) => {
  try {
    res.json({ success: true, message: 'Team controller working' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
